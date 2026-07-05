import { config } from 'dotenv';
config();

import fs from 'fs/promises';
import path from 'path';

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { Faker, id_ID } from '@faker-js/faker';
import { seedLogbookTemplates } from './logbook-templates';

const faker = new Faker({ locale: [id_ID] });

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, admin, username, customSession } from 'better-auth/plugins';
import { hashPassword } from 'better-auth/crypto';

// Impor semua role dari auth.roles.ts
import {
	accessControl,
	superadmin,
	koordinator,
	kepalaLab,
	instruktur,
	peneliti,
	teknisi,
	spmi,
	laboran
} from '../../auth.roles';
import { eq, and } from 'drizzle-orm';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

// Daftarkan semua role di sini agar dikenali oleh better-auth
const allAuthRoles = {
	superadmin,
	koordinator,
	kepalaLab,
	instruktur,
	peneliti,
	teknisi,
	spmi,
	laboran
};

export const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'mysql',
		schema: {
			...authSchema,
			...schema,
			organization: authSchema.laboratorium,
			member: authSchema.laboratoriumMember
		}
	}),
	emailAndPassword: { enabled: true, requireEmailVerification: false },
	plugins: [
		admin(),
		username(),
		organization({
			ac: accessControl,
			roles: allAuthRoles
		}),
		customSession(async ({ user, session }) => {
			const userWithLab = await db.query.user.findFirst({
				where: (u, { eq }) => eq(u.id, user.id),
				with: {
					members: {
						with: { laboratorium: true }
					}
				}
			});

			const firstMember = userWithLab?.members?.[0];

			if (!userWithLab) {
				return {
					user,
					session
				};
			}

			return {
				user: {
					...user,
					role: userWithLab.role,
					laboratorium: firstMember?.laboratorium
						? {
								id: firstMember.laboratorium.id,
								slug: firstMember.laboratorium.slug,
								name: firstMember.laboratorium.name,
								logo: firstMember.laboratorium.logo ?? ''
							}
						: null
				},
				session
			};
		})
	]
});

async function main() {
	console.log('Sedang melakukan seeding...');

	console.log('Mendaftarkan superadmin...');
	const existingSuperadmin = await db.query.user.findFirst({
		where: eq(authSchema.user.email, 'superadmin@gmail.com')
	});

	let globalSuperadminId: string;

	if (!existingSuperadmin) {
		const signUpResponse = await auth.api.signUpEmail({
			body: {
				email: 'superadmin@gmail.com',
				username: 'superadmin',
				password: process.env.DEFAULT_PASSWORD ?? 'password',
				name: 'Global Superadmin'
			}
		});

		if (!signUpResponse) throw new Error('Gagal mendaftarkan superadmin');
		globalSuperadminId = signUpResponse.user.id;

		await db
			.update(authSchema.user)
			.set({ role: 'superadmin' })
			.where(eq(authSchema.user.id, globalSuperadminId));
	} else {
		globalSuperadminId = existingSuperadmin.id;
		const hashedPwd = await hashPassword(process.env.DEFAULT_PASSWORD ?? 'password');
		await db.update(authSchema.account)
			.set({ password: hashedPwd })
			.where(eq(authSchema.account.userId, globalSuperadminId));
		console.log('Password superadmin di-reset ke default.');
	}

	// Buat Laboratorium Utama secara langsung di DB untuk menghindari 401
	console.log('Membuat laboratorium...');
	const labs = [
		{ name: 'Preparasi (lt 2)', slug: 'preparasi' },
		{ name: 'Terpadu (lt 4)', slug: 'terpadu' },
		{ name: 'Frontier Dental Lab Research (lt 4)', slug: 'frontier-dental-lab-research' }
	];

	const labIds: Record<string, string> = {};

	for (const labData of labs) {
		const existingLab = await db.query.laboratorium.findFirst({
			where: eq(authSchema.laboratorium.slug, labData.slug)
		});

		if (!existingLab) {
			const id = crypto.randomUUID();
			await db.insert(authSchema.laboratorium).values({
				id,
				...labData,
				createdAt: new Date()
			});
			labIds[labData.slug] = id;
		} else {
			labIds[labData.slug] = existingLab.id;
		}

		// Jadikan superadmin sebagai owner di laboratorium tersebut jika belum ada
		const existingMember = await db.query.laboratoriumMember.findFirst({
			where: and(
				eq(authSchema.laboratoriumMember.laboratoriumId, labIds[labData.slug]),
				eq(authSchema.laboratoriumMember.userId, globalSuperadminId)
			)
		});

		if (!existingMember) {
			await db.insert(authSchema.laboratoriumMember).values({
				id: crypto.randomUUID(),
				laboratoriumId: labIds[labData.slug],
				userId: globalSuperadminId,
				createdAt: new Date(),
				role: 'superadmin'
			});
		}
	}

	const labIdPreparasi = labIds['preparasi'];

	console.log('Laboratorium dan Superadmin berhasil diproses.');

	console.log('Membuat departemen dan blok...');
	const departmentData = [
		{
			name: 'Konservasi Gigi',
			blocks: ['Restorasi Gigi Direk', 'Endodontik Dasar', 'Estetika Dental']
		},
		{
			name: 'Periodonsia',
			blocks: ['Jaringan Periodontal Dasar', 'Penyakit Periodontal', 'Bedah Periodontal']
		},
		{
			name: 'Prostodonsia',
			blocks: ['Gigi Tiruan Lepasan', 'Gigi Tiruan Cekat', 'Rehabilitasi Stomatognatik']
		},
		{
			name: 'Ortodonsia',
			blocks: ['Tumbuh Kembang Kranial', 'Maloklusi & Diagnosis', 'Mekanoterapi Ortodonti']
		},
		{
			name: 'Bedah Mulut',
			blocks: ['Anestesi Lokal & Ekstraksi', 'Bedah Dentoalveolar', 'Trauma Maksilofasial', 'Blok Bedah Minor']
		}
	];

	type CslCriterion = { name: string; sectionLabel: string; maxScore: number; sortOrder: number };

	const cslKewaspadaanStandar: CslCriterion[] = [
		{ name: 'Mempersiapkan semua alat yang dibutuhkan (sabun antiseptik, jas operasi/gown steril, sarung tangan/glove steril)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 1 },
		{ name: 'Mempersiapkan diri (melepas aksesoris, kuku pendek dan bersih)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 2 },
		{ name: 'Mengalirkan air dan membasahi tangan hingga siku', sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)', maxScore: 2, sortOrder: 3 },
		{ name: 'Mengambil sabun antiseptik and melakukan 6 langkah WHO pada telapak hingga punggung tangan', sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)', maxScore: 2, sortOrder: 4 },
		{ name: 'Membersihkan kuku dan sela jari secara teliti', sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)', maxScore: 2, sortOrder: 5 },
		{ name: 'Melakukan scrubbing/gosokan dari arah tangan menuju siku (satu arah)', sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)', maxScore: 2, sortOrder: 6 },
		{ name: 'Membilas dengan air mengalir dari ujung jari ke arah siku (tangan tetap lebih tinggi dari siku)', sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)', maxScore: 2, sortOrder: 7 },
		{ name: 'Menutup kran dengan siku/pedal dan mengeringkan tangan dengan handuk steril secara aseptik', sectionLabel: 'B. Prosedur Cuci Tangan Bedah (WHO)', maxScore: 2, sortOrder: 8 },
		{ name: 'Mengambil jas operasi steril, membiarkan terbuka tanpa menyentuh benda non-steril', sectionLabel: 'C. Prosedur Gowning', maxScore: 2, sortOrder: 9 },
		{ name: 'Memasukkan kedua tangan ke lengan jas tanpa mengeluarkan jari dari ujung manset (teknik tertutup)', sectionLabel: 'C. Prosedur Gowning', maxScore: 2, sortOrder: 10 },
		{ name: 'Memakai sarung tangan dengan teknik tertutup (tangan tetap di dalam manset jas)', sectionLabel: 'D. Prosedur Gloving', maxScore: 2, sortOrder: 11 },
		{ name: 'Memastikan sarung tangan menutupi manset jas operasi dan tidak ada kebocoran/kontaminasi', sectionLabel: 'D. Prosedur Gloving', maxScore: 2, sortOrder: 12 }
	];

	const cslAnestesiLokal: CslCriterion[] = [
		{ name: 'Menyiapkan alat: spuit/cito-ject, ampul/karpul anestesi, antiseptik (povidone iodine), kapas/tampon', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 1 },
		{ name: 'Persiapan pasien: rekam medik dan informed consent', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 2 },
		{ name: 'Posisi kerja dokter dan posisi kursi pasien sesuai regio yang akan dianestesi', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 3 },
		{ name: 'Aplikasi antiseptik pada area mukosa yang akan disuntik', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 4 },
		{ name: 'Memegang spuit dengan teknik yang benar (pen grasp)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 5 },
		{ name: 'Melakukan insersi jarum dengan sudut yang tepat (45 derajat untuk infiltrasi)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 6 },
		{ name: 'Teknik infiltrasi pada mucobuccal fold / teknik blok menentukan landmark (plica pterygomandibularis, linea obliqua interna)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 7 },
		{ name: 'Melakukan aspirasi (memastikan jarum tidak masuk pembuluh darah)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 8 },
		{ name: 'Mendeponir larutan anestesi secara perlahan', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 9 },
		{ name: 'Menarik jarum keluar dengan hati-hati dan menutup jarum (one-hand technique)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 10 },
		{ name: 'Evaluasi efek anestesi (subjektif: rasa kebas; objektif: tes dengan sonde/eksavator)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 11 }
	];

	const cslPeresepanObat: CslCriterion[] = [
		{ name: 'Memeriksa rekam medis pasien dan indikasi pencabutan', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 1 },
		{ name: 'Memastikan tidak ada kontraindikasi obat (alergi, penyakit sistemik, interaksi obat)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 2 },
		{ name: 'Menuliskan identitas dokter (nama, SIP) pada resep', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 3 },
		{ name: 'Menuliskan identitas pasien (nama, umur, alamat/berat badan)', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 4 },
		{ name: 'Menuliskan tanggal penulisan resep', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 5 },
		{ name: 'Menuliskan tanda R/ (Recipe) dengan benar', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 6 },
		{ name: 'Analgesik: memilih jenis dan dosis yang tepat (misal Paracetamol 500mg, Asam Mefenamat 500mg, atau Ibuprofen 400mg)', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 7 },
		{ name: 'Antibiotik: memilih antibiotik yang rasional (misal Amoxicillin 500mg) sesuai infeksi/prosedur', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 8 },
		{ name: 'Menuliskan jumlah obat (jumlah total/angka romawi)', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 9 },
		{ name: 'Menuliskan aturan pakai (signa) yang jelas (frekuensi, waktu penggunaan)', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 10 },
		{ name: 'Menuliskan tanda tangan atau paraf dokter', sectionLabel: 'B. Prosedur (Peresepan)', maxScore: 2, sortOrder: 11 },
		{ name: 'Menjelaskan tujuan pemberian obat kepada pasien', sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)', maxScore: 2, sortOrder: 12 },
		{ name: 'Menjelaskan efek samping obat yang mungkin terjadi', sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)', maxScore: 2, sortOrder: 13 },
		{ name: 'Menginstruksikan pasien untuk meminum antibiotik hingga habis', sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)', maxScore: 2, sortOrder: 14 },
		{ name: 'Menginstruksikan pasien penggunaan analgesik hanya saat nyeri', sectionLabel: 'C. Tahap Pasca Interaksi (Edukasi)', maxScore: 2, sortOrder: 15 }
	];

	const cslPencabutanClosedMethod: CslCriterion[] = [
		{ name: 'Mempersiapkan semua alat yang dibutuhkan (diagnostik set, tang ekstraksi, elevator)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 1 },
		{ name: 'Mempersiapkan semua bahan yang dibutuhkan (betadine, kapas dan tampon)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 2 },
		{ name: 'Mempersiapkan pasien (rekam medik, informed consent)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 3 },
		{ name: 'Tiap kelompok terdiri dari 2 orang yang bertindak sebagai dokter dan pasien', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 4 },
		{ name: 'Dokter menggunakan jas kerja dan masker (surgical mask)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 5 },
		{ name: 'Dokter menyapa pasien dan mempersilahkan pasien duduk di kursi unit', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 6 },
		{ name: 'Dokter melakukan cuci tangan (scrubbing up)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 7 },
		{ name: 'Dokter menggunakan sarung tangan (gloved hand)', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 8 },
		{ name: 'Dokter berada di tempat (tools dental unit) yang telah disediakan', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 9 },
		{ name: 'Dokter memilih dan menentukan jenis teknik anestesi', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 10 },
		{ name: 'Dokter melakukan desinfeksi extra dan intra oral', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 11 },
		{ name: 'Dokter melakukan teknik anestesi', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 12 },
		{ name: 'Dokter melakukan evaluasi efek dan keefektifan anestesi', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 13 },
		{ name: 'Dokter memilih dan menentukan jenis teknik pencabutan yang digunakan', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 14 },
		{ name: 'Dokter memilih dan menentukan jenis tang yang digunakan', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 15 },
		{ name: 'Dokter melakukan pencabutan gigi sesuai teknik yang dipilih', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 16 },
		{ name: 'Dokter melakukan pembersihan daerah luka pencabutan', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 17 },
		{ name: 'Dokter memberikan instruksi setelah pencabutan gigi', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 18 },
		{ name: 'Dokter mengevaluasi kemungkinan komplikasi yang terjadi', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 19 },
		{ name: 'Dokter mempersilahkan pasien bertanya bila ada hal yang belum jelas', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 20 },
		{ name: 'Dokter mempersilahkan pasien pulang', sectionLabel: 'B. Prosedur', maxScore: 2, sortOrder: 21 },
		{ name: 'Mengumpulkan seluruh alat yang telah digunakan ke wadah yang telah disiapkan', sectionLabel: 'C. Manajemen Setelah Prosedur', maxScore: 2, sortOrder: 22 }
	];

	const cslPenjahitan: CslCriterion[] = [
		{ name: 'Persiapan alat & bahan (needle holder, gunting, pinset sirurgis, jarum, benang, kassa, povidone iodine)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 1 },
		{ name: 'Persiapan diri (mencuci tangan 6 langkah, memakai masker dan sarung tangan steril)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 2 },
		{ name: 'Persiapan pasien (posisi kerja dan lampu operasional yang tepat)', sectionLabel: 'A. Persiapan', maxScore: 2, sortOrder: 3 },
		{ name: 'Debridement (membersihkan sisa bekuan darah/debris dengan kassa steril)', sectionLabel: 'B. Tahap Pre-Suturing', maxScore: 2, sortOrder: 4 },
		{ name: 'Inspeksi soket (memastikan tidak ada perdarahan aktif yang masif sebelum dijahit)', sectionLabel: 'B. Tahap Pre-Suturing', maxScore: 2, sortOrder: 5 },
		{ name: 'Melakukan aplikasi antiseptik pada area kerja/anestesi lokal tambahan (bila perlu) dan fiksasi tepi luka', sectionLabel: 'B. Tahap Pre-Suturing', maxScore: 2, sortOrder: 6 },
		{ name: 'Pemasangan jarum: dipegang pada 1/3 belakang (dekat mata benang) menggunakan needle holder', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 7 },
		{ name: 'Penetrasi: jarum masuk tegak lurus terhadap jaringan, minimal 2-3 mm dari tepi luka', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 8 },
		{ name: 'Teknik penjahitan: menggunakan teknik simple interrupted suture (atau sesuai instruksi)', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 9 },
		{ name: 'Simpul (knotting): membuat simpul bedah dengan tegangan yang pas (tidak terlalu kencang/kendur)', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 10 },
		{ name: 'Posisi simpul: diletakkan di samping garis luka (bukan tepat di atas luka)', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 11 },
		{ name: 'Pemotongan benang: memotong ujung benang dengan menyisakan sekitar 2-3 mm', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 12 },
		{ name: 'Asepsis: menjaga sterilitas alat dan benang selama prosedur berlangsung', sectionLabel: 'C. Tahap Prosedur Penjahitan', maxScore: 2, sortOrder: 13 },
		{ name: 'Melakukan aplikasi antiseptik terakhir di atas area jahitan', sectionLabel: 'D. Tahap Akhir & Edukasi', maxScore: 2, sortOrder: 14 },
		{ name: 'Instruksi pasien: menghindari menyentuh jahitan, diet lunak, dan jadwal kontrol/lepas jahitan', sectionLabel: 'D. Tahap Akhir & Edukasi', maxScore: 2, sortOrder: 15 },
		{ name: 'Manajemen sampah medis (membuang jarum ke sharp container)', sectionLabel: 'D. Tahap Akhir & Edukasi', maxScore: 2, sortOrder: 16 }
	];

	const cslScoreLegend = [
		{ value: 0, label: 'Tidak dilakukan' },
		{ value: 1, label: 'Dilakukan tapi belum memuaskan/sempurna' },
		{ value: 2, label: 'Dilakukan dengan memuaskan/sempurna' }
	];

	for (const dept of departmentData) {
		let existingDept = await db.query.department.findFirst({
			where: eq(schema.department.name, dept.name)
		});

		let deptId: string;
		if (!existingDept) {
			deptId = crypto.randomUUID();
			await db.insert(schema.department).values({
				id: deptId,
				name: dept.name
			});
		} else {
			deptId = existingDept.id;
		}

		// Insert Blok yang sesuai dengan departemen tersebut
		for (const blockName of dept.blocks) {
			let existingBlock = await db.query.block.findFirst({
				where: and(eq(schema.block.name, blockName), eq(schema.block.departmentId, deptId))
			});

			let blockId: string;
			if (!existingBlock) {
				blockId = crypto.randomUUID();
				await db.insert(schema.block).values({
					id: blockId,
					name: blockName,
					departmentId: deptId
				});
			} else {
				blockId = existingBlock.id;
			}

			// Insert Modul untuk setiap blok (minimal 1)
			let modules: any[] = [];
			if (blockName === 'Restorasi Gigi Direk') {
				modules = [
					{
						name: 'Kelas I - Preparasi',
						description: 'Tahap preparasi kavitas Kelas I',
						component: 'PREPARASI',
						scoringMode: 'TOTAL',
						groupLabel: 'Kelas I (SITE 1)'
					},
					{
						name: 'Kelas I - Restorasi',
						description: 'Tahap restorasi/penumpatan kavitas Kelas I',
						component: 'RESTORASI',
						scoringMode: 'TOTAL',
						groupLabel: 'Kelas I (SITE 1)'
					},
					{
						name: 'Kelas II - Preparasi',
						description: 'Tahap preparasi kavitas Kelas II',
						component: 'PREPARASI',
						scoringMode: 'TOTAL',
						groupLabel: 'Kelas II (SITE 2)'
					},
					{
						name: 'Kelas II - Restorasi',
						description: 'Tahap restorasi/penumpatan kavitas Kelas II',
						component: 'RESTORASI',
						scoringMode: 'TOTAL',
						groupLabel: 'Kelas II (SITE 2)'
					}
				];
			} else if (blockName === 'Blok Bedah Minor') {
				modules = [
					{
						name: 'CSL 1 - Kewaspadaan Standar',
						description: 'Cuci tangan bedah WHO, gown operasi, dan glove steril',
						scoringMode: 'CHECKLIST',
						scoreLegend: cslScoreLegend,
						criteria: cslKewaspadaanStandar
					},
					{
						name: 'CSL 2 - Teknik Anestesi Lokal',
						description: 'Prosedur anestesi lokal infiltrasi/blok',
						scoringMode: 'CHECKLIST',
						scoreLegend: cslScoreLegend,
						criteria: cslAnestesiLokal
					},
					{
						name: 'CSL 3 - Peresepan Obat Pasca Pencabutan Gigi',
						description: 'Peresepan analgesik dan antibiotik pasca ekstraksi',
						scoringMode: 'CHECKLIST',
						scoreLegend: cslScoreLegend,
						criteria: cslPeresepanObat
					},
					{
						name: 'CSL 4 - Pencabutan Gigi Closed Method di Model',
						description: 'Prosedur ekstraksi gigi teknik closed method',
						scoringMode: 'CHECKLIST',
						scoreLegend: cslScoreLegend,
						criteria: cslPencabutanClosedMethod
					},
					{
						name: 'CSL 5 - Penjahitan pada Luka Pasca Pencabutan Gigi',
						description: 'Prosedur suturing pasca ekstraksi gigi',
						scoringMode: 'CHECKLIST',
						scoreLegend: cslScoreLegend,
						criteria: cslPenjahitan
					}
				];
			} else {
				modules = [
					{
						name: `Modul 1 - Dasar ${blockName}`,
						description: `Pengenalan dasar-dasar pada materi ${blockName}`,
						component: null,
						scoringMode: 'TOTAL',
						groupLabel: null,
						scoreLegend: null
					},
					{
						name: `Modul 2 - Lanjutan ${blockName}`,
						description: `Pendalaman materi dan teknik ${blockName}`,
						component: null,
						scoringMode: 'TOTAL',
						groupLabel: null,
						scoreLegend: null
					}
				];
			}

			for (const mod of modules) {
				const existingMod = await db.query.practicumModule.findFirst({
					where: and(eq(schema.practicumModule.name, mod.name), eq(schema.practicumModule.blockId, blockId))
				});

				let moduleIdToUse: string;
				if (!existingMod) {
					moduleIdToUse = crypto.randomUUID();
					await db.insert(schema.practicumModule).values({
						id: moduleIdToUse,
						name: mod.name,
						description: mod.description,
						component: mod.component,
						scoringMode: mod.scoringMode,
						groupLabel: mod.groupLabel,
						scoreLegend: mod.scoreLegend,
						blockId: blockId
					});
					console.log(`  -> Modul dibuat: ${mod.name}`);
				} else {
					moduleIdToUse = existingMod.id;
					await db.update(schema.practicumModule)
						.set({
							component: mod.component,
							groupLabel: mod.groupLabel,
							scoreLegend: mod.scoreLegend,
							scoringMode: mod.scoringMode
						})
						.where(eq(schema.practicumModule.id, moduleIdToUse));
				}

				if (mod.scoringMode === 'CHECKLIST' && mod.criteria) {
					for (const crit of mod.criteria) {
						const existingCrit = await db.query.practicumModuleCriteria.findFirst({
							where: and(
								eq(schema.practicumModuleCriteria.moduleId, moduleIdToUse),
								eq(schema.practicumModuleCriteria.name, crit.name)
							)
						});
						if (!existingCrit) {
							await db.insert(schema.practicumModuleCriteria).values({
								id: crypto.randomUUID(),
								moduleId: moduleIdToUse,
								name: crit.name,
								maxScore: crit.maxScore,
								sortOrder: crit.sortOrder,
								sectionLabel: crit.sectionLabel
							});
						} else {
							await db.update(schema.practicumModuleCriteria)
								.set({
									maxScore: crit.maxScore,
									sortOrder: crit.sortOrder,
									sectionLabel: crit.sectionLabel
								})
								.where(eq(schema.practicumModuleCriteria.id, existingCrit.id));
						}
					}
				}
			}
		}
	}

	console.log('Membuat data inventori (Warehouse, Item, Equipment, Category)...');
	let existingWarehouse = await db.query.warehouse.findFirst({
		where: eq(schema.warehouse.name, 'Gudang Utama FKG')
	});

	let warehouseId: string;
	if (!existingWarehouse) {
		warehouseId = crypto.randomUUID();
		await db.insert(schema.warehouse).values({
			id: warehouseId,
			name: 'Gudang Utama FKG',
			location: 'Lantai 1 Gedung A'
		});
	} else {
		warehouseId = existingWarehouse.id;
	}

	console.log('Membuat kategori peralatan...');
	const categories = [
		{ name: 'Gunting', description: 'Berbagai jenis gunting medis' },
		{ name: 'Kaca Mulut', description: 'Kaca mulut pemeriksaan' },
		{ name: 'Pinset', description: 'Pinset dental' },
		{ name: 'Sonde', description: 'Sonde dental explorer' }
	];

	const categoryMap: Record<string, string> = {};
	for (const cat of categories) {
		let existingCat = await db.query.equipmentCategory.findFirst({
			where: eq(schema.equipmentCategory.name, cat.name)
		});
		if (!existingCat) {
			const id = crypto.randomUUID();
			await db.insert(schema.equipmentCategory).values({
				id,
				name: cat.name,
				description: cat.description,
				createdAt: new Date()
			});
			categoryMap[cat.name] = id;
		} else {
			categoryMap[cat.name] = existingCat.id;
		}
	}

	const items = [
		{
			name: 'Dental Unit',
			type: 'ASSET' as const,
			equipmentType: 'DENTAL_UNIT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Autoclave',
			type: 'ASSET' as const,
			equipmentType: 'LAB_INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Micromotor',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Scaler',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Light Cure',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'UNIT' as const
		},
		{
			name: 'Gunting Bengkok',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'PCS' as const,
			categoryId: categoryMap['Gunting']
		},
		{
			name: 'Kaca Mulut No. 3',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'PCS' as const,
			categoryId: categoryMap['Kaca Mulut']
		},
		{
			name: 'Root elevator (cryer)',
			type: 'ASSET' as const,
			equipmentType: 'INSTRUMENT' as const,
			baseUnit: 'PCS' as const
		},
		{
			name: 'Ecosin',
			type: 'CONSUMABLE' as const,
			baseUnit: 'BOTOL' as const
		}
	];

	for (const itemData of items) {
		let existingItem = await db.query.item.findFirst({
			where: eq(schema.item.name, itemData.name)
		});

		let itemId: string;
		if (!existingItem) {
			itemId = crypto.randomUUID();
			await db.insert(schema.item).values({
				id: itemId,
				...itemData,
				createdAt: new Date()
			});
		} else {
			itemId = existingItem.id;
			// Update categoryId if needed
			if (itemData.categoryId && !existingItem.categoryId) {
				await db.update(schema.item)
					.set({ categoryId: itemData.categoryId })
					.where(eq(schema.item.id, itemId));
			}
		}

		if (itemData.type === 'ASSET') {
			const existingEquipments = await db.query.equipment.findMany({
				where: eq(schema.equipment.itemId, itemId)
			});

			if (existingEquipments.length === 0) {
				if (itemData.name === 'Root elevator (cryer)') {
					// 5 units Schezer/kanan
					for (let i = 1; i <= 5; i++) {
						await db.insert(schema.equipment).values({
							id: crypto.randomUUID(),
							itemId: itemId,
							warehouseId: warehouseId,
							laboratoriumId: labIdPreparasi,
							serialNumber: `REC-KAN-${faker.string.alphanumeric(6).toUpperCase()}`,
							brand: 'Schezer',
							variant: 'kanan',
							status: 'READY',
							condition: 'BAIK',
							storageLocation: 'Lemari A1',
							createdAt: new Date()
						});
					}
					// 5 units Schezer/kiri
					for (let i = 1; i <= 5; i++) {
						await db.insert(schema.equipment).values({
							id: crypto.randomUUID(),
							itemId: itemId,
							warehouseId: warehouseId,
							laboratoriumId: labIdPreparasi,
							serialNumber: `REC-KIR-${faker.string.alphanumeric(6).toUpperCase()}`,
							brand: 'Schezer',
							variant: 'kiri',
							status: 'READY',
							condition: 'BAIK',
							storageLocation: 'Lemari A2',
							createdAt: new Date()
						});
					}
				} else {
					for (let i = 1; i <= 10; i++) {
						await db.insert(schema.equipment).values({
							id: crypto.randomUUID(),
							itemId: itemId,
							warehouseId: warehouseId,
							laboratoriumId: labIdPreparasi,
							serialNumber: `${itemData.name.substring(0, 3).toUpperCase()}-${faker.string.alphanumeric(8).toUpperCase()}`,
							brand: faker.company.name(),
							variant: null,
							status: 'READY',
							condition: 'BAIK',
							storageLocation: `Lemari ${faker.helpers.arrayElement(['A1', 'A2', 'B1', 'B2'])}`,
							createdAt: new Date()
						});
					}
				}
			}
		} else {
			// CONSUMABLE
			const existingStock = await db.query.stock.findMany({
				where: eq(schema.stock.itemId, itemId)
			});

			if (existingStock.length === 0) {
				if (itemData.name === 'Ecosin') {
					// Seed brand X / variant "isi 50 ampul"
					await db.insert(schema.stock).values({
						id: crypto.randomUUID(),
						itemId: itemId,
						laboratoriumId: labIdPreparasi,
						qty: 50,
						brand: 'Brand X',
						variant: 'isi 50 ampul',
						condition: 'baik'
					});
					// Seed brand X / variant "isi 40 ampul"
					await db.insert(schema.stock).values({
						id: crypto.randomUUID(),
						itemId: itemId,
						laboratoriumId: labIdPreparasi,
						qty: 40,
						brand: 'Brand X',
						variant: 'isi 40 ampul',
						condition: 'baik'
					});
				} else {
					await db.insert(schema.stock).values({
						id: crypto.randomUUID(),
						itemId: itemId,
						laboratoriumId: labIdPreparasi,
						qty: 100,
						brand: faker.company.name(),
						variant: null,
						condition: 'baik'
					});
				}
			}
		}
	}

	// Seed Maintenance and Approval data
	console.log('Membuat data pemeliharaan dan persetujuan (approval) seeder...');
	const sampleEquip = await db.query.equipment.findFirst();
	if (sampleEquip) {
		const uploadsDir = path.resolve('static/uploads/receipts');
		await fs.mkdir(uploadsDir, { recursive: true });
		await fs.writeFile(path.join(uploadsDir, 'placeholder.pdf'), 'Placeholder receipt content');

		// Find a kepalaLab user
		const kepalaLabUser = await db.query.user.findFirst({
			where: eq(authSchema.user.role, 'kepalaLab')
		});

		const firstMaintDesc = 'Pemeliharaan Alat - Kerusakan Motor';
		const existingMaint = await db.query.maintenance.findFirst({
			where: eq(schema.maintenance.description, firstMaintDesc)
		});

		if (!existingMaint) {
			// 1. Pending Approval Maintenance
			const maintPendingId = crypto.randomUUID();
			await db.insert(schema.maintenance).values({
				id: maintPendingId,
				equipmentId: sampleEquip.id,
				maintenanceType: 'KOREKTIF',
				description: firstMaintDesc,
				scheduledDate: new Date(),
				completionDate: new Date(),
				status: 'COMPLETED',
				cost: 150000,
				notaFileName: 'placeholder.pdf',
				createdAt: new Date()
			});

			await db.insert(schema.approval).values({
				id: crypto.randomUUID(),
				referenceType: 'MAINTENANCE',
				referenceId: maintPendingId,
				status: 'PENDING',
				createdAt: new Date()
			});

			// 2. Approved Maintenance
			const maintApprovedId = crypto.randomUUID();
			await db.insert(schema.maintenance).values({
				id: maintApprovedId,
				equipmentId: sampleEquip.id,
				maintenanceType: 'KOREKTIF',
				description: 'Pemeliharaan Alat - Ganti Kabel',
				scheduledDate: new Date(),
				completionDate: new Date(),
				status: 'COMPLETED',
				cost: 200000,
				notaFileName: 'placeholder.pdf',
				createdAt: new Date()
			});

			await db.insert(schema.approval).values({
				id: crypto.randomUUID(),
				referenceType: 'MAINTENANCE',
				referenceId: maintApprovedId,
				status: 'APPROVED',
				approvedBy: kepalaLabUser?.id ?? null,
				note: 'Nota valid dan sesuai.',
				createdAt: new Date()
			});

			// 3. Rejected Maintenance
			const maintRejectedId = crypto.randomUUID();
			await db.insert(schema.maintenance).values({
				id: maintRejectedId,
				equipmentId: sampleEquip.id,
				maintenanceType: 'PREVENTIF',
				description: 'Pemeliharaan Berkala Tahunan',
				scheduledDate: new Date(),
				completionDate: new Date(),
				status: 'COMPLETED',
				cost: 50000,
				notaFileName: 'placeholder.pdf',
				createdAt: new Date()
			});

			await db.insert(schema.approval).values({
				id: crypto.randomUUID(),
				referenceType: 'MAINTENANCE',
				referenceId: maintRejectedId,
				status: 'REJECTED',
				approvedBy: kepalaLabUser?.id ?? null,
				note: 'Foto nota buram. Mohon unggah ulang.',
				createdAt: new Date()
			});

			console.log('  -> Berhasil seeding data pemeliharaan & approval!');
		}
	}

	console.log('Seeding logbook templates...');
	await seedLogbookTemplates(db);

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
