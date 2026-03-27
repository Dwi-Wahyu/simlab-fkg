import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, organization, auditLog } from '$lib/server/db/schema';
import { and, eq, ne, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = locals;
	if (!user || !user.organization) throw redirect(302, '/login');

	let targetOrgId = url.searchParams.get('targetOrgId');
	const preselectedEquipmentId = url.searchParams.get('equipmentId');

	// Identifikasi Satuan Induk (Puskomlekad)
	const parentOrg = await db.query.organization.findFirst({
		where: isNull(organization.parentId)
	});

	if (user.organization.parentId && !targetOrgId && parentOrg) {
		throw redirect(302, `?targetOrgId=${parentOrg.id}`);
	}

	let allowedOrganizations = [];

	if (user.organization.parentId) {
		// User adalah satuan jajaran (anak)
		// Hanya boleh meminjam dari Satuan Induk
		if (parentOrg) {
			allowedOrganizations = [parentOrg];
		}
	} else {
		// User adalah Satuan Induk
		// Boleh meminjam dari satuan jajaran (anak-anaknya)
		allowedOrganizations = await db.query.organization.findMany({
			where: eq(organization.parentId, user.organization.id)
		});
	}

	let targetOrg = null;
	let availableEquipment = [];

	if (targetOrgId) {
		// Validasi: target harus ada dalam daftar yang diperbolehkan
		const isAllowed = allowedOrganizations.some((org) => org.id === targetOrgId);

		if (isAllowed) {
			// Ambil detail organisasi target
			targetOrg = await db.query.organization.findFirst({
				where: eq(organization.id, targetOrgId)
			});

			if (targetOrg) {
				// Ambil equipment yang tersedia (READY) di organisasi target
				const rawEquipment = await db.query.equipment.findMany({
					where: and(eq(equipment.status, 'READY'), eq(equipment.organizationId, targetOrgId)),
					with: {
						item: true,
						warehouse: true
					}
				});

				// Grouping berdasarkan itemId + warehouseId + condition
				const groups: Record<string, any> = {};
				rawEquipment.forEach((eqp) => {
					const key = `${eqp.itemId}-${eqp.warehouseId}-${eqp.condition}`;
					if (!groups[key]) {
						groups[key] = {
							id: key,
							itemId: eqp.itemId,
							warehouseId: eqp.warehouseId,
							name: eqp.item.name,
							brand: eqp.brand,
							condition: eqp.condition,
							warehouseName: eqp.warehouse?.name,
							totalAvailable: 0,
							equipments: [] // Daftar alat individu dalam grup ini
						};
					}
					groups[key].totalAvailable++;
					groups[key].equipments.push({
						id: eqp.id,
						serialNumber: eqp.serialNumber,
						condition: eqp.condition,
						status: eqp.status
					});

					// Jika alat ini dipre-select dari URL, tandai grupnya
					if (eqp.id === preselectedEquipmentId) {
						groups[key].preselected = true;
					}
				});

				availableEquipment = Object.values(groups);
			}
		} else if (user.organization.parentId && parentOrg) {
			// Jika anak mencoba meminjam dari selain induk, redirect ke induk
			throw redirect(302, `?targetOrgId=${parentOrg.id}`);
		}
	}

	return {
		groupedEquipment: availableEquipment,
		targetOrg,
		organizations: allowedOrganizations,
		preselectedEquipmentId,
		orgSlug: user.organization.slug
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();

		const { user } = locals;

		// Parse data grup & manual pick
		const itemIds = formData.getAll('itemId[]');
		const warehouseIds = formData.getAll('warehouseId[]');
		const conditions = formData.getAll('condition[]');
		const qtys = formData.getAll('qty[]');
		const manualEquipmentIds = formData.getAll('manualEquipmentId[]').map((id) => id.toString());

		const targetOrgId = formData.get('targetOrgId')?.toString();

		if (!targetOrgId) return fail(400, { message: 'Organisasi tujuan harus ditentukan' });

		const targetOrg = await db.query.organization.findFirst({
			where: eq(organization.id, targetOrgId)
		});

		if (!targetOrg) return fail(400, { message: 'Organisasi tujuan tidak ditemukan' });

		const isUserParent = !user.organization.parentId;
		const isTargetParent = !targetOrg.parentId;

		if (isUserParent === isTargetParent) {
			return fail(400, {
				message: 'Peminjaman hanya diperbolehkan antara satuan jajaran dan satuan induk'
			});
		}

		if (targetOrgId === user.organization.id) {
			return fail(400, { message: 'Tidak dapat meminjam dari organisasi sendiri' });
		}

		// Group requests (Auto-pick)
		const requestedGroups = itemIds
			.map((id, index) => ({
				itemId: id.toString(),
				warehouseId: warehouseIds[index]?.toString(),
				condition: conditions[index]?.toString() as any,
				qty: parseInt(qtys[index]?.toString() || '0')
			}))
			.filter((g) => g.qty > 0);

		if (requestedGroups.length === 0 && manualEquipmentIds.length === 0) {
			return fail(400, { message: 'Minimal 1 alat harus dipilih' });
		}

		const unit = formData.get('unit')?.toString();
		const purpose = formData.get('purpose')?.toString() as
			| 'OPERASI'
			| 'LATIHAN'
			| 'PERINTAH_LANGSUNG';
		const startDateStr = formData.get('startDate')?.toString();
		const endDateStr = formData.get('endDate')?.toString();
		const overrideReason = formData.get('overrideReason')?.toString();
		const attachment = formData.get('attachment') as File;

		if (!unit || !purpose || !startDateStr) {
			return fail(400, { message: 'Data peminjaman tidak lengkap' });
		}

		if (purpose === 'PERINTAH_LANGSUNG' && !overrideReason) {
			return fail(400, { message: 'Keterangan perintah langsung wajib diisi' });
		}

		// Handle file upload
		let attachmentPath = null;
		let attachmentName = null;

		if (attachment && attachment.size > 0) {
			const ext = path.extname(attachment.name).toLowerCase();
			if (ext !== '.pdf' && ext !== '.docx') {
				return fail(400, { message: 'Hanya file PDF atau DOCX yang diperbolehkan' });
			}

			// Maks 5MB
			if (attachment.size > 5 * 1024 * 1024) {
				return fail(400, { message: 'Ukuran file maksimal 5MB' });
			}

			const fileName = `${uuidv4()}${ext}`;
			const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'lending');

			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}

			const filePath = path.join(uploadDir, fileName);
			const arrayBuffer = await attachment.arrayBuffer();
			fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

			attachmentPath = `/uploads/lending/${fileName}`;
			attachmentName = attachment.name;
		}

		try {
			const lendingId = uuidv4();
			const isOverride = purpose === 'PERINTAH_LANGSUNG';

			await db.transaction(async (tx) => {
				// Insert lending
				await tx.insert(lending).values({
					id: lendingId,
					organizationId: targetOrgId,
					unit: unit,
					purpose: purpose,
					startDate: new Date(startDateStr),
					endDate: endDateStr ? new Date(endDateStr) : null,
					status: isOverride ? 'PERINTAH_LANGSUNG' : 'DRAFT',
					overrideBy: isOverride ? user.id : null,
					overrideReason: isOverride ? overrideReason : null,
					attachmentPath: attachmentPath,
					attachmentName: attachmentName,
					requestedBy: user.id
				});

				// 1. Proses Manual Selection (Specific Equipment IDs)
				for (const eqId of manualEquipmentIds) {
					// Validasi status READY
					const eqp = await tx.query.equipment.findFirst({
						where: and(eq(equipment.id, eqId), eq(equipment.status, 'READY'))
					});

					if (!eqp) throw new Error(`Alat dengan ID ${eqId} tidak tersedia atau sudah dipinjam`);

					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId,
						equipmentId: eqId,
						qty: 1
					});
				}

				// 2. Proses Auto-pick by Quantity (Group Selection)
				for (const group of requestedGroups) {
					// Cari ID equipment yang READY sesuai kriteria
					const availableEqs = await tx.query.equipment.findMany({
						where: and(
							eq(equipment.itemId, group.itemId),
							eq(equipment.organizationId, targetOrgId),
							eq(equipment.warehouseId, group.warehouseId),
							eq(equipment.condition, group.condition),
							eq(equipment.status, 'READY')
						),
						limit: group.qty,
						columns: { id: true }
					});

					if (availableEqs.length < group.qty) {
						throw new Error(`Stok alat tidak mencukupi untuk item kriteria tertentu`);
					}

					// Insert lending items untuk setiap equipment ID yang ditemukan
					for (const eqp of availableEqs) {
						await tx.insert(lendingItem).values({
							id: uuidv4(),
							lendingId,
							equipmentId: eqp.id,
							qty: 1
						});
					}
				}

				if (isOverride) {
					await tx.insert(auditLog).values({
						id: uuidv4(),
						userId: user.id,
						action: 'COMMAND_OVERRIDE',
						tableName: 'lending',
						recordId: lendingId,
						newValue: JSON.stringify({
							status: 'PERINTAH_LANGSUNG',
							purpose: 'PERINTAH_LANGSUNG',
							reason: overrideReason
						})
					});
				}
			});

			// Kirim notifikasi ke organisasi target (pemberi pinjaman)
			await createNotification({
				organizationId: targetOrgId,
				title: isOverride ? 'Perintah Langsung Peminjaman' : 'Pengajuan Peminjaman Baru',
				body: isOverride
					? `Unit ${unit} melakukan peminjaman darurat (Perintah Langsung).`
					: `Unit ${unit} mengajukan peminjaman alat untuk keperluan ${purpose}.`,
				priority: isOverride ? 'HIGH' : 'MEDIUM',
				action: {
					type: 'LENDING_DETAIL',
					resourceId: lendingId,
					webPath: `/${user.organization.slug}/peminjaman/${lendingId}`
				}
			});

			return { success: true, message: 'Peminjaman berhasil diajukan' };
		} catch (err) {
			console.error('Error creating lending:', err);
			return fail(500, { message: 'Gagal membuat pengajuan peminjaman' });
		}
	}
};
