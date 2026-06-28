// src/routes/api/admin/dashboard/[role]/+server.ts

import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	auditLog,
	equipment,
	maintenance,
	lending,
	approval,
	wasteLog,
	safetyIncident,
	inventoryReport,
	auditChecklist,
	practicumLogbook,
	practicumScheduleInstructor,
	practicumLogbookGeneration
} from '$lib/server/db/schema';
import { laboratorium, user } from '$lib/server/db/auth.schema';
import { eq, and, count, desc, gte, lt, sql, ne, isNull, isNotNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import type { DashboardRole } from '$lib/types/dashboard';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const role = params.role as DashboardRole;

	// Guard: role di URL harus cocok dengan role user yang login
	if (locals.user.role !== role && locals.user.role !== 'superadmin') {
		throw error(403, 'Forbidden');
	}

	const now = new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const tomorrow = new Date(startOfDay);
	tomorrow.setDate(tomorrow.getDate() + 1);

	switch (role) {
		case 'superadmin': {
			const [totalUsersResult] = await db.select({ value: count() }).from(user);
			const [totalLabResult] = await db.select({ value: count() }).from(laboratorium);

			const recentLogs = await db.query.auditLog.findMany({
				orderBy: [desc(auditLog.createdAt)],
				limit: 8,
				with: { user: { columns: { name: true } } }
			});

			const [baikResult] = await db
				.select({ value: count() })
				.from(equipment)
				.where(eq(equipment.condition, 'BAIK'));
			const [ringanResult] = await db
				.select({ value: count() })
				.from(equipment)
				.where(eq(equipment.condition, 'RUSAK_RINGAN'));
			const [beratResult] = await db
				.select({ value: count() })
				.from(equipment)
				.where(eq(equipment.condition, 'RUSAK_BERAT'));
			const [totalEquipResult] = await db.select({ value: count() }).from(equipment);

			const [incidentsResult] = await db
				.select({ value: count() })
				.from(safetyIncident)
				.where(ne(safetyIncident.status, 'CLOSED'));

			return json({
				role: 'superadmin',
				data: {
					totalUsers: Number(totalUsersResult.value),
					totalLaboratorium: Number(totalLabResult.value),
					recentAuditLogs: recentLogs,
					inventorySummary: {
						totalEquipment: Number(totalEquipResult.value),
						baik: Number(baikResult.value),
						rusakRingan: Number(ringanResult.value),
						rusakBerat: Number(beratResult.value)
					},
					activeIncidents: Number(incidentsResult.value)
				}
			});
		}

		case 'koordinator': {
			// Jadwal hari ini
			const todaySchedules = await db.query.practicumSchedule.findMany({
				where: (s, { and, gte, lt }) =>
					and(gte(s.startTime, startOfDay), lt(s.startTime, tomorrow)),
				limit: 5,
				with: { laboratorium: { columns: { name: true } } }
			});

			const [activeLendingsResult] = await db
				.select({ value: count() })
				.from(lending)
				.where(eq(lending.status, 'DIPINJAM'));

			const [pendingApprovalsResult] = await db
				.select({ value: count() })
				.from(approval)
				.where(eq(approval.status, 'PENDING'));

			const [maintenanceAlertsResult] = await db
				.select({ value: count() })
				.from(maintenance)
				.where(eq(maintenance.status, 'PENDING'));

			const [wasteLogsResult] = await db
				.select({ value: count() })
				.from(wasteLog)
				.where(gte(wasteLog.createdAt, startOfMonth));

			return json({
				role: 'koordinator',
				data: {
					todaySchedules: todaySchedules.map((s) => ({
						id: s.id,
						name: s.title,
						type: s.type,
						laboratoriumName: s.laboratorium?.name ?? '-',
						startTime: s.startTime,
						endTime: s.endTime
					})),
					activeLendings: Number(activeLendingsResult.value),
					pendingApprovals: Number(pendingApprovalsResult.value),
					maintenanceAlerts: Number(maintenanceAlertsResult.value),
					recentWasteLogs: Number(wasteLogsResult.value)
				}
			});
		}

		case 'kepalaLab': {
			const labId = locals.user.laboratorium?.id;
			if (!labId) throw error(400, 'Laboratorium tidak ditemukan untuk user ini');

			const [totalEquip] = await db
				.select({ value: count() })
				.from(equipment)
				.where(eq(equipment.laboratoriumId, labId));
			const [baik] = await db
				.select({ value: count() })
				.from(equipment)
				.where(and(eq(equipment.laboratoriumId, labId), eq(equipment.condition, 'BAIK')));
			const [ringan] = await db
				.select({ value: count() })
				.from(equipment)
				.where(and(eq(equipment.laboratoriumId, labId), eq(equipment.condition, 'RUSAK_RINGAN')));
			const [berat] = await db
				.select({ value: count() })
				.from(equipment)
				.where(and(eq(equipment.laboratoriumId, labId), eq(equipment.condition, 'RUSAK_BERAT')));
			const [inUse] = await db
				.select({ value: count() })
				.from(equipment)
				.where(and(eq(equipment.laboratoriumId, labId), eq(equipment.status, 'IN_USE')));
			const [maint] = await db
				.select({ value: count() })
				.from(equipment)
				.where(and(eq(equipment.laboratoriumId, labId), eq(equipment.status, 'MAINTENANCE')));

			// Pending lending approvals untuk lab ini
			const pendingLendings = await db.query.lending.findMany({
				where: (l, { eq, and }) => and(eq(l.laboratoriumId, labId), eq(l.status, 'DRAFT')),
				limit: 5,
				with: { requestedByUser: { columns: { name: true } } }
			});

			const [pendingMaintResult] = await db
				.select({ value: count() })
				.from(approval)
				.where(and(eq(approval.status, 'PENDING'), eq(approval.referenceType, 'MAINTENANCE')));

			const latestReport = await db.query.inventoryReport.findFirst({
				where: (r, { eq }) => eq(r.laboratoriumId, labId),
				orderBy: [desc(inventoryReport.createdAt)]
			});

			return json({
				role: 'kepalaLab',
				data: {
					laboratoriumName: locals.user.laboratorium?.name ?? '-',
					inventorySummary: {
						totalEquipment: Number(totalEquip.value),
						baik: Number(baik.value),
						rusakRingan: Number(ringan.value),
						rusakBerat: Number(berat.value),
						inUse: Number(inUse.value),
						maintenance: Number(maint.value)
					},
					pendingLendingApprovals: pendingLendings.map((l) => ({
						id: l.id,
						purpose: l.purpose,
						requesterName: l.requestedByUser?.name ?? '-',
						createdAt: l.createdAt
					})),
					pendingMaintenanceApprovals: Number(pendingMaintResult.value),
					latestInventoryReport: latestReport
						? {
								id: latestReport.id,
								status: latestReport.status,
								createdAt: latestReport.createdAt
							}
						: null
				}
			});
		}

		case 'instruktur': {
			const userId = locals.user.id;

			// Jadwal yang diampu instruktur ini
			const myScheduleLinks = await db.query.practicumScheduleInstructor.findMany({
				where: (s, { eq }) => eq(s.instructorId, userId),
				with: {
					schedule: {
						with: { laboratorium: { columns: { name: true } } }
					}
				},
				limit: 5
			});

			const upcomingSchedules = myScheduleLinks
				.map((link) => link.schedule)
				.filter(Boolean)
				.map((s) => ({
					id: s.id,
					name: s.title,
					type: s.type,
					date: s.startTime,
					startTime: s.startTime,
					endTime: s.endTime,
					laboratoriumName: s.laboratorium?.name ?? '-'
				}));

			// Penilaian pending
			const pendingAssessmentsList = await db.query.practicumAssessment.findMany({
				where: (a, { eq }) => eq(a.status, 'DRAFT'),
				with: { schedule: { columns: { title: true } } },
				limit: 5
			});

			// Logbook terbaru instruktur ini
			const myLogbooks = await db.query.practicumLogbook.findMany({
				where: (l, { eq }) => eq(l.userId, userId),
				orderBy: [desc(practicumLogbook.updatedAt)],
				limit: 5
			});

			const [schedulesThisMonth] = await db
				.select({ value: count() })
				.from(practicumScheduleInstructor)
				.where(eq(practicumScheduleInstructor.instructorId, userId));

			return json({
				role: 'instruktur',
				data: {
					upcomingSchedules,
					pendingAssessments: pendingAssessmentsList.map((a) => ({
						id: a.id,
						scheduleName: a.schedule?.title ?? '-',
						studentCount: 0 // TODO: join ke practicumClassMember jika diperlukan
					})),
					myRecentLogbooks: myLogbooks.map((l) => ({
						id: l.id,
						title: 'Logbook Praktikum',
						submittedAt: l.updatedAt,
						status: 'SUBMITTED'
					})),
					totalSchedulesThisMonth: Number(schedulesThisMonth.value)
				}
			});
		}

		case 'peneliti': {
			const userId = locals.user.id;

			const activeLendingsList = await db.query.lending.findMany({
				where: (l, { eq, and, ne }) => and(eq(l.requestedBy, userId), ne(l.status, 'RETURNED')),
				limit: 5,
				with: { items: { with: { equipment: { with: { item: { columns: { name: true } } } } } } }
			});

			const myLogbooks = await db.query.practicumLogbookGeneration.findMany({
				where: (l, { eq }) => eq(l.userId, userId),
				orderBy: [desc(practicumLogbookGeneration.generatedAt)],
				limit: 5,
				with: { series: { columns: { name: true } } }
			});

			const [totalBorrowed] = await db
				.select({ value: count() })
				.from(lending)
				.where(and(eq(lending.requestedBy, userId), gte(lending.createdAt, startOfMonth)));

			return json({
				role: 'peneliti',
				data: {
					activeLendings: activeLendingsList.map((l) => ({
						id: l.id,
						equipmentName: l.items?.[0]?.equipment?.item?.name ?? '-',
						dueDate: l.endDate ?? null,
						status: l.status ?? 'DRAFT'
					})),
					myLogbooks: myLogbooks.map((lb) => ({
						id: lb.seriesId,
						seriesName: lb.series?.name ?? '-',
						lastUpdated: lb.generatedAt,
						status: 'COMPLETED'
					})),
					upcomingPracticum: [], // TODO: join ke practicumClassMember → practicumSchedule jika diperlukan
					totalBorrowedThisMonth: Number(totalBorrowed.value)
				}
			});
		}

		case 'teknisi': {
			const pendingMaintenanceList = await db.query.maintenance.findMany({
				where: (m, { or, eq }) => or(eq(m.status, 'PENDING'), eq(m.status, 'IN_PROGRESS')),
				orderBy: [desc(maintenance.scheduledDate)],
				limit: 6,
				with: { equipment: { with: { item: { columns: { name: true } } } } }
			});

			// Kalibrasi = maintenance dengan type KALIBRASI yang upcoming
			const upcomingCalibrations = await db.query.maintenance.findMany({
				where: (m, { and, eq, gte }) =>
					and(
						eq(m.maintenanceType, 'KALIBRASI'),
						eq(m.status, 'PENDING'),
						gte(m.scheduledDate, now)
					),
				orderBy: [maintenance.scheduledDate],
				limit: 5,
				with: { equipment: { with: { item: { columns: { name: true } } } } }
			});

			// Alat rusak perlu perhatian
			const needsAttention = await db.query.equipment.findMany({
				where: (e, { ne }) => ne(e.condition, 'BAIK'),
				limit: 6,
				with: { item: { columns: { name: true } } }
			});

			const [completedResult] = await db
				.select({ value: count() })
				.from(maintenance)
				.where(
					and(eq(maintenance.status, 'COMPLETED'), gte(maintenance.completionDate, startOfMonth))
				);

			return json({
				role: 'teknisi',
				data: {
					pendingMaintenance: pendingMaintenanceList.map((m) => ({
						id: m.id,
						equipmentName: m.equipment?.item?.name ?? '-',
						maintenanceType: m.maintenanceType,
						scheduledDate: m.scheduledDate ?? null,
						status: m.status
					})),
					upcomingCalibrations: upcomingCalibrations.map((c) => ({
						id: c.id,
						equipmentName: c.equipment?.item?.name ?? '-',
						scheduledDate: c.scheduledDate ?? null
					})),
					equipmentNeedingAttention: needsAttention.map((e) => ({
						id: e.id,
						name: e.item?.name ?? '-',
						condition: e.condition,
						serialNumber: e.serialNumber ?? null
					})),
					completedThisMonth: Number(completedResult.value)
				}
			});
		}

		case 'spmi': {
			const latestReports = await db.query.inventoryReport.findMany({
				orderBy: [desc(inventoryReport.createdAt)],
				limit: 5,
				with: { laboratorium: { columns: { name: true } } }
			});

			const checklists = await db.query.auditChecklist.findMany({
				orderBy: [desc(auditChecklist.createdAt)],
				limit: 5,
				with: { laboratorium: { columns: { name: true } } }
			});

			const incidents = await db.query.safetyIncident.findMany({
				orderBy: [desc(safetyIncident.createdAt)],
				limit: 5,
				with: { laboratorium: { columns: { name: true } } }
			});

			const [totalEquipResult] = await db.select({ value: count() }).from(equipment);
			// Alat yang sudah dikalibrasi (punya record maintenance KALIBRASI COMPLETED)
			const [calibratedResult] = await db
				.select({ value: count() })
				.from(maintenance)
				.where(
					and(eq(maintenance.maintenanceType, 'KALIBRASI'), eq(maintenance.status, 'COMPLETED'))
				);

			const total = Number(totalEquipResult.value);
			const calibrated = Number(calibratedResult.value);

			return json({
				role: 'spmi',
				data: {
					latestInventoryReports: latestReports.map((r) => ({
						id: r.id,
						laboratoriumName: r.laboratorium?.name ?? '-',
						status: r.status ?? 'DRAFT',
						createdAt: r.createdAt ?? new Date()
					})),
					auditChecklists: checklists.map((c) => ({
						id: c.id,
						laboratoriumName: c.laboratorium?.name ?? '-',
						completionRate: c.score ?? 0,
						createdAt: c.createdAt ?? new Date()
					})),
					safetyIncidents: incidents.map((i) => ({
						id: i.id,
						severity: i.severity,
						status: i.status,
						createdAt: i.createdAt,
						laboratoriumName: i.laboratorium?.name ?? '-'
					})),
					calibrationCompliance: {
						total,
						calibrated,
						percentage: total > 0 ? Math.round((calibrated / total) * 100) : 0
					}
				}
			});
		}

		default:
			throw error(400, 'Role tidak dikenali');
	}
};
