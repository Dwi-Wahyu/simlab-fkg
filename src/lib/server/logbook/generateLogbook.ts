import createReport from 'docx-templates';
import { and, eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import {
	practicumAssessment,
	practicumLogbook,
	practicumLogbookGeneration,
	practicumLogbookTemplateField,
	practicumSchedule,
	practicumSeries,
	practicumModule,
	laboratorium
} from '$lib/server/db/schema';

const TEMPLATE_DIR = path.resolve('static/templates/logbook');
const GENERATED_DIR = path.resolve('static/generated/logbook');

// Handle Vite ESM/CJS interop for docx-templates
const generateReport = (
	typeof createReport === 'function' ? createReport : (createReport as any).default
) as typeof createReport;

// ─── Tipe ────────────────────────────────────────────────────────────────────

/** Nilai isian manual dikirim dari form sebelum generate, key = placeholderKey. */
export type ManualFieldInputs = Record<string, string>;

// ─── Table Builders Registry ──────────────────────────────────────────────────
// Bagian kompleks (tabel, blok XML majemuk) yang tidak bisa direpresentasikan
// sebagai field datar di practicumLogbookTemplateField. Setiap builder
// menerima context lengkap dan mengembalikan string XML OpenXML. Template memilih
// builder lewat practicumLogbookTemplate.tableBuilderKey.
type ScheduleData = {
	name: string;
	date: string;
	time: string;
	assessments: Array<{ moduleName: string; score: number; instructorName: string }>;
};

type BuilderContext = {
	student: typeof user.$inferSelect;
	series: NonNullable<Awaited<ReturnType<typeof getSeriesWithLab>>>;
	schedules: ScheduleData[];
};

const TABLE_BUILDERS: Record<string, (ctx: BuilderContext) => string> = {
	'logbook-rowspan-table': (ctx) => buildLogbookRowspanTableXml(ctx.schedules)
};

// ─── OpenXML Builders ────────────────────────────────────────────────────────

/**
 * Bangun OpenXML tabel logbook dengan rowspan pada kolom Jadwal.
 */
function buildLogbookRowspanTableXml(schedules: ScheduleData[]): string {
	let xml = `<w:tbl>
		<w:tblPr>
			<w:tblW w:w="0" w:type="auto"/>
			<w:tblBorders>
				<w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
				<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
				<w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
				<w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
				<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
				<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
			</w:tblBorders>
		</w:tblPr>
		<w:tblGrid>
			<w:gridCol w:w="2500"/>
			<w:gridCol w:w="3000"/>
			<w:gridCol w:w="1000"/>
			<w:gridCol w:w="3500"/>
		</w:tblGrid>
		<w:tr>
			<w:trPr><w:tblHeader/></w:trPr>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar>
						<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
						<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
					</w:tcMar>
				</w:tcPr>
				<w:p>
					<w:pPr><w:jc w:val="center"/></w:pPr>
					<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Jadwal</w:t></w:r>
				</w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar>
						<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
						<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
					</w:tcMar>
				</w:tcPr>
				<w:p>
					<w:pPr><w:jc w:val="center"/></w:pPr>
					<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Modul</w:t></w:r>
				</w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar>
						<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
						<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
					</w:tcMar>
				</w:tcPr>
				<w:p>
					<w:pPr><w:jc w:val="center"/></w:pPr>
					<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Nilai</w:t></w:r>
				</w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar>
						<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
						<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
					</w:tcMar>
				</w:tcPr>
				<w:p>
					<w:pPr><w:jc w:val="center"/></w:pPr>
					<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Penilai</w:t></w:r>
				</w:p>
			</w:tc>
		</w:tr>`;

	for (const schedule of schedules) {
		const assessmentCount = schedule.assessments.length;

		if (assessmentCount === 0) {
			xml += `
			<w:tr>
				<w:tc>
					<w:tcPr>
						<w:vAlign w:val="center"/>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(schedule.name)}</w:t></w:r>
					</w:p>
					<w:p>
						<w:pPr><w:rPr><w:sz w:val="16"/><w:color w:val="666666"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="666666"/></w:rPr><w:t>${schedule.date} · ${schedule.time}</w:t></w:r>
					</w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:gridSpan w:val="3"/>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr><w:rPr><w:i/><w:color w:val="999999"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:i/><w:color w:val="999999"/></w:rPr><w:t>Belum ada penilaian</w:t></w:r>
					</w:p>
				</w:tc>
			</w:tr>`;
			continue;
		}

		for (let i = 0; i < assessmentCount; i++) {
			const a = schedule.assessments[i];
			xml += `<w:tr>`;

			if (i === 0) {
				xml += `
				<w:tc>
					<w:tcPr>
						<w:vMerge w:val="restart"/>
						<w:vAlign w:val="center"/>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(schedule.name)}</w:t></w:r>
					</w:p>
					<w:p>
						<w:pPr><w:rPr><w:sz w:val="16"/><w:color w:val="666666"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="666666"/></w:rPr><w:t>${schedule.date} · ${schedule.time}</w:t></w:r>
					</w:p>
				</w:tc>`;
			} else {
				xml += `
				<w:tc>
					<w:tcPr>
						<w:vMerge/>
					</w:tcPr>
					<w:p/>
				</w:tc>`;
			}

			xml += `
				<w:tc>
					<w:tcPr>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(a.moduleName)}</w:t></w:r>
					</w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="18"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${a.score}</w:t></w:r>
					</w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:pPr>
						<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(a.instructorName)}</w:t></w:r>
					</w:p>
				</w:tc>
			</w:tr>`;
		}
	}

	xml += `</w:tbl>`;
	return xml;
}

/**
 * Konversi URL atau path gambar ke objek descriptor docx-templates.
 */
async function imageToDocxTemplateImage(imageUrl: string | null | undefined): Promise<any | null> {
	if (!imageUrl) return null;
	try {
		let buf: Buffer;
		let ext = 'jpg';
		let resolvedUrl = imageUrl;
		if (
			!resolvedUrl.startsWith('http://') &&
			!resolvedUrl.startsWith('https://') &&
			!resolvedUrl.startsWith('/')
		) {
			resolvedUrl = `/uploads/profiles/${resolvedUrl}`;
		}
		if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
			const res = await fetch(resolvedUrl, { signal: AbortSignal.timeout(5000) });
			if (!res.ok) return null;
			buf = Buffer.from(await res.arrayBuffer());
			const contentType = res.headers.get('content-type') ?? 'image/jpeg';
			ext = contentType.split('/')[1] || 'jpg';
		} else {
			// Path lokal relatif dari project root (misal: /uploads/avatar/xxx.jpg)
			const localPath = path.resolve(`static${resolvedUrl}`);
			buf = await fs.readFile(localPath);
			ext = path.extname(resolvedUrl).slice(1).toLowerCase();
		}
		let finalExt = ext.toLowerCase();
		if (finalExt === 'jpeg') {
			finalExt = 'jpg';
		}
		// Use base64 string format — confirmed to work correctly with LibreOffice/Gotenberg.
		// ArrayBuffer/Buffer approaches cause XML namespace issues in the generated DOCX.
		return {
			data: buf.toString('base64'),
			extension: `.${finalExt}`,
			width: 3.5, // 3.5 cm width
			height: 4.5 // 4.5 cm height
		};
	} catch (err: any) {
		console.error('[LOGBOOK] Failed to load image:', imageUrl, err);
		return null;
	}
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/** Resolusi dot-path sederhana, misal 'series.laboratorium.name'. */
function resolvePath(obj: unknown, dotPath: string): unknown {
	return dotPath
		.split('.')
		.reduce<unknown>(
			(acc, key) =>
				acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
			obj
		);
}

async function getSeriesById(seriesId: string) {
	return db.query.practicumSeries.findFirst({
		where: eq(practicumSeries.id, seriesId)
	});
}

async function convertDocxToPdf(docxBuffer: Buffer, fileName: string): Promise<Buffer> {
	const formData = new FormData();
	formData.append('files', new Blob([new Uint8Array(docxBuffer)]), fileName);

	const response = await fetch(
		`${env.GOTENBERG_URL || 'http://localhost:4000'}/forms/libreoffice/convert`,
		{
			method: 'POST',
			body: formData
		}
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Gotenberg conversion failed: ${response.statusText}. Details: ${text}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export async function generateLogbookForSeries(
	studentId: string,
	seriesId: string,
	manualInputs: ManualFieldInputs = {}
): Promise<{ fileName: string; buffer: Buffer }> {
	console.log(`[LOGBOOK] Start: student=${studentId}, series=${seriesId}`);

	// 1. Mahasiswa
	const student = await db.query.user.findFirst({ where: eq(user.id, studentId) });
	if (!student) throw new Error('Mahasiswa tidak ditemukan');

	// 2. Seri
	const series = await getSeriesById(seriesId);
	if (!series) throw new Error('Seri praktikum tidak ditemukan');

	// 2b. Ambil jadwal-jadwal dalam seri ini lebih awal, untuk resolve blockId & laboratoriumId
	//     (blok & lab sekarang melekat ke jadwal, bukan ke seri)
	const schedules = await db.query.practicumSchedule.findMany({
		where: eq(practicumSchedule.seriesId, seriesId),
		orderBy: (s, { asc }) => [asc(s.startTime)]
	});

	const resolvedBlockId = schedules.find((s) => s.blockId)?.blockId ?? null;
	const resolvedLabId = schedules.find((s) => s.laboratoriumId)?.laboratoriumId ?? null;
	const resolvedLab = resolvedLabId
		? await db.query.laboratorium.findFirst({ where: eq(laboratorium.id, resolvedLabId) })
		: null;

	// 3. Template file + metadata field
	let templateRecord = null;
	if (resolvedBlockId) {
		templateRecord = await db.query.practicumLogbookTemplate.findFirst({
			where: (t, { exists, eq: eqFn, and: andFn }) =>
				exists(
					db
						.select()
						.from(practicumModule)
						.where(
							andFn(
								eqFn(practicumModule.id, t.moduleId),
								eqFn(practicumModule.blockId, resolvedBlockId)
							)
						)
				)
		});
	}
	const finalTemplate = templateRecord ?? (await db.query.practicumLogbookTemplate.findFirst());
	if (!finalTemplate) {
		throw new Error(
			'Tidak ada template logbook terdaftar di database (tabel practicum_logbook_template kosong). ' +
				'Jalankan `bun run db:seed-logbook-templates` setelah seeder modul dijalankan.'
		);
	}

	const templateFields = await db.query.practicumLogbookTemplateField.findMany({
		where: eq(practicumLogbookTemplateField.templateId, finalTemplate.id),
		orderBy: (f, { asc }) => [asc(f.sortOrder)]
	});

	const templateBuffer = await fs.readFile(path.join(TEMPLATE_DIR, finalTemplate.templateFilePath));

	// 4. Jadwal dalam seri
	// (Schedules were already loaded in step 2b)

	// 5. Penilaian per jadwal
	const schedulesData: ScheduleData[] = await Promise.all(
		schedules.map(async (schedule) => {
			const assessments = await db.query.practicumAssessment.findMany({
				where: and(
					eq(practicumAssessment.studentId, studentId),
					eq(practicumAssessment.scheduleId, schedule.id)
				),
				with: { module: true, instructor: true }
			});

			const dt = new Date(schedule.startTime);
			return {
				name: schedule.title,
				date: dt.toLocaleDateString('id-ID', {
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				}),
				time: dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
				assessments: (() => {
					const scheduleComponents = new Set(
						assessments.map((a) => a.module?.component).filter(Boolean)
					);
					return assessments.map((a) => {
						const comp = a.module?.component;
						const label = comp
							? scheduleComponents.size > 1
								? comp === 'PREPARASI'
									? 'Prep'
									: 'Resto'
								: comp === 'PREPARASI'
									? 'Preparasi'
									: 'Restorasi'
							: null;
						return {
							moduleName: label ? `${a.module?.name ?? '-'} (${label})` : (a.module?.name ?? '-'),
							score: a.score,
							instructorName: a.instructor?.name ?? '-'
						};
					});
				})()
			};
		})
	);

	// 6. Resolusi context untuk auto-source path field
	const resolveContext = {
		student,
		series: {
			...series,
			laboratorium: resolvedLab
		},
		schedules: schedulesData
	};

	// 7. Resolusi tiap field metadata jadi key-value untuk docx-templates.
	// Inisialisasi default key agar tidak terjadi ReferenceError saat render data kosong di production
	const renderData: Record<string, any> = {
		seriesName: '',
		studentName: '',
		studentNim: '',
		laboratoriumName: '',
		fotoMahasiswa: null,
		hasPhoto: false,
		tableLogbook: ''
	};

	for (const field of templateFields) {
		let rawValue: unknown;

		if (field.source === 'auto') {
			rawValue = field.autoSourcePath
				? resolvePath(resolveContext, field.autoSourcePath)
				: undefined;
		} else {
			rawValue = manualInputs[field.placeholderKey];
		}

		if (
			(rawValue === undefined || rawValue === null || rawValue === '') &&
			field.defaultValue !== null
		) {
			rawValue = field.defaultValue ?? undefined;
		}

		if (
			field.source === 'manual' &&
			field.required &&
			(rawValue === undefined || rawValue === null || rawValue === '')
		) {
			throw new Error(`Field wajib "${field.label}" belum diisi`);
		}

		if (field.valueType === 'image') {
			const imgDesc = await imageToDocxTemplateImage(
				typeof rawValue === 'string' ? rawValue : null
			);
			renderData[field.placeholderKey] = imgDesc;
			renderData['hasPhoto'] = !!imgDesc;
		} else {
			renderData[field.placeholderKey] =
				rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
		}
	}

	// 8. Bagian kompleks (tabel, dsb) via builder registry (sebagai raw XML)
	if (finalTemplate.tableBuilderKey) {
		const builder = TABLE_BUILDERS[finalTemplate.tableBuilderKey];
		if (!builder) {
			throw new Error(
				`tableBuilderKey "${finalTemplate.tableBuilderKey}" tidak dikenal di TABLE_BUILDERS`
			);
		}
		const rawXmlTable = builder({ student, series, schedules: schedulesData });
		renderData['tableLogbook'] = `||</w:t></w:r></w:p>${rawXmlTable}<w:p><w:r><w:t>||`;
	}

	// 9. Render dengan docx-templates
	const report = await generateReport({
		template: templateBuffer,
		data: renderData,
		cmdDelimiter: ['{', '}'],
		literalXmlDelimiter: '||',
		fixSmartQuotes: true,
		failFast: false
	});

	const buffer = Buffer.from(report);

	// 10. Simpan ke disk (di folder user)
	const userDir = path.join(GENERATED_DIR, studentId);
	await fs.mkdir(userDir, { recursive: true });

	const timestamp = Date.now();
	const baseName = `logbook_${studentId}_${seriesId}_${timestamp}`;
	const docxFileName = `${baseName}.docx`;
	const pdfFileName = `${baseName}.pdf`;

	const docxPath = path.join(userDir, docxFileName);
	await fs.writeFile(docxPath, buffer);

	// Convert to PDF
	let pdfSaved = false;
	try {
		console.log(`[LOGBOOK] Converting to PDF via Gotenberg...`);
		const pdfBuffer = await convertDocxToPdf(buffer, docxFileName);
		const pdfPath = path.join(userDir, pdfFileName);
		await fs.writeFile(pdfPath, pdfBuffer);
		pdfSaved = true;
		console.log(`[LOGBOOK] PDF saved: ${pdfFileName}`);
	} catch (err) {
		console.error('[LOGBOOK] Gotenberg conversion failed:', err);
	}

	// 11. Upsert generation record
	await db
		.insert(practicumLogbookGeneration)
		.values({
			userId: studentId,
			seriesId,
			generatedFileName: docxFileName,
			pdfUrl: pdfSaved ? pdfFileName : null,
			generatedAt: new Date()
		})
		.onDuplicateKeyUpdate({
			set: {
				generatedFileName: docxFileName,
				pdfUrl: pdfSaved ? pdfFileName : null,
				generatedAt: new Date()
			}
		});

	// Update lastGeneratedAt global
	const existingLogbook = await db.query.practicumLogbook.findFirst({
		where: eq(practicumLogbook.userId, studentId)
	});
	if (existingLogbook) {
		await db
			.update(practicumLogbook)
			.set({ lastGeneratedAt: new Date() })
			.where(eq(practicumLogbook.id, existingLogbook.id));
	} else {
		await db.insert(practicumLogbook).values({ userId: studentId, lastGeneratedAt: new Date() });
	}

	console.log(`[LOGBOOK] Done: ${docxFileName}`);
	return { fileName: docxFileName, buffer };
}
