import { config } from 'dotenv';

config();

import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../schema';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema, mode: 'default' });

const BLOCK_NAME = 'Penyakit Jaringan Keras Gigi';

/**
 * Format 2 rentang skor (band) jadi 1 teks deskripsi kriteria.
 * Skema saat ini belum punya tabel rentang skor terpisah (practicum_criteria_band),
 * jadi kedua rentang digabung rapi di kolom `description` yang sudah ada.
 */
function formatBandedDescription(
	bandHigh: { range: string; text: string },
	bandLow: { range: string; text: string }
) {
	return `${bandHigh.range}: ${bandHigh.text}\n${bandLow.range}: ${bandLow.text}`;
}

type ModuleDefinition = {
	name: string;
	component: 'PREPARASI' | 'RESTORASI' | null;
	criteriaName: string;
	description: string;
};

const MODULES: ModuleDefinition[] = [
	// Baris A — Caries Removal: komponen umum, bukan Preparasi/Restorasi
	{
		name: 'CARIES REMOVAL',
		component: null,
		criteriaName: 'Caries Removal',
		description: formatBandedDescription(
			{
				range: '90-95',
				text: 'Menyisakan affected dentin/sound dentin dan sound enamel'
			},
			{
				range: '80-89',
				text: 'Tersisa infected dentin dan atau demineralized enamel'
			}
		)
	},

	// Baris B — Kelas I–V: dipakai bersama oleh KELAS I (SITE 1), KELAS II (SITE 2),
	// KELAS III (SITE 2), KELAS IV (SITE 2), KELAS V (SITE 3) — satu modul untuk semua
	// jadwal "Kelas", karena rubriknya memang sama persis di semua site/kelas tersebut.
	{
		name: 'PREPARASI-KELAS',
		component: 'PREPARASI',
		criteriaName: 'Preparasi',
		description: formatBandedDescription(
			{
				range: '90-95',
				text: 'Memenuhi prinsip preparasi (outline form, convenience form, resistance form)'
			},
			{ range: '80-89', text: 'Tidak memenuhi salah satu prinsip preparasi' }
		)
	},
	{
		name: 'RESTORASI-KELAS',
		component: 'RESTORASI',
		criteriaName: 'Restorasi',
		description: formatBandedDescription(
			{ range: '90-95', text: 'Restorasi sesuai bentuk anatomi & halus' },
			{
				range: '80-89',
				text: 'Restorasi tidak sesuai bentuk anatomi/tidak halus/overhanging'
			}
		)
	},

	// Baris C/D/E — Inlay, Onlay, Overlay: masing-masing hanya pakai Preparasi (tidak ada
	// modul Restorasi untuk ketiganya, sesuai instruksi). Rubrik teksnya identik untuk
	// ketiganya di form asli, tapi tetap dibuat modul terpisah karena jadwalnya berbeda.
	{
		name: 'PREPARASI-INLAY',
		component: 'PREPARASI',
		criteriaName: 'Preparasi',
		description: formatBandedDescription(
			{
				range: '90-95',
				text: 'Memenuhi prinsip preparasi (outline form, convenience form, resistance form, retention form, intra & reverse bevel)'
			},
			{ range: '80-89', text: 'Tidak memenuhi salah satu prinsip preparasi' }
		)
	},
	{
		name: 'PREPARASI-ONLAY',
		component: 'PREPARASI',
		criteriaName: 'Preparasi',
		description: formatBandedDescription(
			{
				range: '90-95',
				text: 'Memenuhi prinsip preparasi (outline form, convenience form, resistance form, retention form, intra & reverse bevel)'
			},
			{ range: '80-89', text: 'Tidak memenuhi salah satu prinsip preparasi' }
		)
	},
	{
		name: 'PREPARASI-OVERLAY',
		component: 'PREPARASI',
		criteriaName: 'Preparasi',
		description: formatBandedDescription(
			{
				range: '90-95',
				text: 'Memenuhi prinsip preparasi (outline form, convenience form, resistance form, retention form, intra & reverse bevel)'
			},
			{ range: '80-89', text: 'Tidak memenuhi salah satu prinsip preparasi' }
		)
	}
];

async function main() {
	console.log(`Mencari blok "${BLOCK_NAME}"...`);

	const block = await db.query.block.findFirst({
		where: eq(schema.block.name, BLOCK_NAME)
	});

	if (!block) {
		console.error(`Error: Blok "${BLOCK_NAME}" tidak ditemukan. Jalankan seed blok.ts dulu.`);
		process.exit(1);
	}

	console.log(`Blok ditemukan (ID: ${block.id}). Seeding ${MODULES.length} modul...\n`);

	for (const mod of MODULES) {
		const existingModule = await db.query.practicumModule.findFirst({
			where: and(
				eq(schema.practicumModule.name, mod.name),
				eq(schema.practicumModule.blockId, block.id)
			)
		});

		if (existingModule) {
			console.log(`- SKIP: Modul "${mod.name}" sudah ada (ID: ${existingModule.id})`);
			continue;
		}

		const moduleId = crypto.randomUUID();

		await db.insert(schema.practicumModule).values({
			id: moduleId,
			name: mod.name,
			blockId: block.id,
			component: mod.component,
			scoringMode: 'RUBRIK',
			createdAt: new Date()
		});

		await db.insert(schema.practicumModuleCriteria).values({
			id: crypto.randomUUID(),
			moduleId,
			name: mod.criteriaName,
			description: mod.description,
			maxScore: 100,
			sortOrder: 0
		});

		console.log(`- DIBUAT: Modul "${mod.name}" (component: ${mod.component ?? '-'})`);
	}

	console.log('\nSeeding modul Jaringan Keras selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
