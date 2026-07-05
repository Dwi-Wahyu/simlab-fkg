import createReport from 'docx-templates';
import { and, eq, inArray } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import {
	practicumAssessment,
	practicumSchedule,
	practicumModule,
	practicumModuleCriteria,
	practicumAssessmentCriteriaScore,
	practicumClass
} from '$lib/server/db/schema';

const TEMPLATE_DIR = path.resolve('static/templates/csl');
const GENERATED_DIR = path.resolve('static/generated/csl');

const generateReport = (
	typeof createReport === 'function' ? createReport : (createReport as any).default
) as typeof createReport;

type CslModuleData = {
	moduleName: string;
	scheduleDate: string;
	scoreLegend: { value: number; label: string }[] | null;
	sections: {
		label: string | null;
		items: { name: string; maxScore: number; score: number | null }[];
	}[];
	totalScore: number;
	totalMax: number;
	comment: string | null;
};

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function buildCslBlockXml(data: CslModuleData): string {
	let xml = `
	<w:p>
		<w:pPr><w:keepNext/></w:pPr>
		<w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>${escapeXml(data.moduleName)}</w:t></w:r>
	</w:p>
	<w:p>
		<w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr><w:t>Tanggal Penilaian: ${escapeXml(data.scheduleDate)}</w:t></w:r>
	</w:p>
	`;

	if (data.scoreLegend) {
		xml += `
		<w:p>
			<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="555555"/></w:rPr><w:t>Skala: ${data.scoreLegend.map((l) => `${l.value} = ${l.label}`).join(' · ')}</w:t></w:r>
		</w:p>
		`;
	}

	xml += `
	<w:tbl>
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
			<w:gridCol w:w="600"/>
			<w:gridCol w:w="5500"/>
			<w:gridCol w:w="1000"/>
			<w:gridCol w:w="1000"/>
			<w:gridCol w:w="1000"/>
		</w:tblGrid>
		<w:tr>
			<w:trPr><w:tblHeader/></w:trPr>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
				</w:tcPr>
				<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>NO</w:t></w:r></w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
				</w:tcPr>
				<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>ASPEK PENILAIAN</w:t></w:r></w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
				</w:tcPr>
				<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Skor 0</w:t></w:r></w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
				</w:tcPr>
				<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Skor 1</w:t></w:r></w:p>
			</w:tc>
			<w:tc>
				<w:tcPr>
					<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>
					<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>
				</w:tcPr>
				<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Skor 2</w:t></w:r></w:p>
			</w:tc>
		</w:tr>
	`;

	let itemIndex = 1;
	for (const sec of data.sections) {
		if (sec.label) {
			xml += `
			<w:tr>
				<w:tc>
					<w:tcPr>
						<w:gridSpan w:val="5"/>
						<w:shd w:val="clear" w:color="auto" w:fill="EAF2EC"/>
						<w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
					</w:tcPr>
					<w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(sec.label)}</w:t></w:r></w:p>
				</w:tc>
			</w:tr>
			`;
		}

		for (const item of sec.items) {
			const check0 = item.score === 0 ? '✓' : '';
			const check1 = item.score === 1 ? '✓' : '';
			const check2 = item.score === 2 ? '✓' : '';

			xml += `
			<w:tr>
				<w:tc>
					<w:tcPr>
						<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>
					</w:tcPr>
					<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>${itemIndex}</w:t></w:r></w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>
					</w:tcPr>
					<w:p><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>${escapeXml(item.name)}</w:t></w:r></w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>
					</w:tcPr>
					<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="2D5A43"/></w:rPr><w:t>${check0}</w:t></w:r></w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>
					</w:tcPr>
					<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="2D5A43"/></w:rPr><w:t>${check1}</w:t></w:r></w:p>
				</w:tc>
				<w:tc>
					<w:tcPr>
						<w:tcMar><w:top w:w="60" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tcMar>
					</w:tcPr>
					<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="2D5A43"/></w:rPr><w:t>${check2}</w:t></w:r></w:p>
				</w:tc>
			</w:tr>
			`;
			itemIndex++;
		}
	}

	const percentage = data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 100) : 0;

	xml += `
	</w:tbl>
	<w:p>
		<w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
		<w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Nilai Akhir = (Skor Diperoleh / Skor Total Maksimal) x 100%</w:t></w:r>
	</w:p>
	<w:p>
		<w:r><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="2D5A43"/></w:rPr><w:t>Nilai = ${data.totalScore} / ${data.totalMax} x 100% = ${percentage}%</w:t></w:r>
	</w:p>
	`;

	if (data.comment) {
		xml += `
		<w:p>
			<w:pPr><w:spacing w:before="120"/></w:pPr>
			<w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Catatan / Feedback Instruktur:</w:t></w:r>
		</w:p>
		<w:p>
			<w:r><w:rPr><w:sz w:val="18"/><w:i/></w:rPr><w:t>"${escapeXml(data.comment)}"</w:t></w:r>
		</w:p>
		`;
	}

	xml += `
	<w:p>
		<w:pPr><w:spacing w:before="360" w:after="360"/></w:pPr>
		<w:r><w:rPr><w:sz w:val="18"/><w:color w:val="CCCCCC"/></w:rPr><w:t>_________________________________________________________________________________</w:t></w:r>
	</w:p>
	`;

	return xml;
}

export async function generateCslAssessmentForStudent(
	studentId: string,
	scheduleId: string
): Promise<{ fileName: string; buffer: Buffer }> {
	// 1. Get schedule info
	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, scheduleId),
		with: {
			modules: {
				with: {
					module: {
						with: {
							criteria: {
								orderBy: (c, { asc }) => [asc(c.sortOrder)]
							}
						}
					}
				}
			}
		}
	});

	if (!schedule) throw new Error('Schedule tidak ditemukan');

	// Get student user
	const studentUser = await db.query.user.findFirst({
		where: eq(user.id, studentId)
	});

	if (!studentUser) throw new Error('Student tidak ditemukan');

	// 2. Fetch assessments for this schedule + student
	const assessments = await db.query.practicumAssessment.findMany({
		where: and(
			eq(practicumAssessment.scheduleId, scheduleId),
			eq(practicumAssessment.studentId, studentId)
		)
	});

	const checklistAssessments = assessments.filter((a) => {
		const sm = schedule.modules.find((m) => m.moduleId === a.moduleId);
		return sm?.module?.scoringMode === 'CHECKLIST';
	});

	if (checklistAssessments.length === 0) {
		throw new Error('Tidak ada data penilaian CSL yang terisi.');
	}

	// Fetch criteria scores
	const criteriaScores = await db.query.practicumAssessmentCriteriaScore.findMany({
		where: inArray(
			practicumAssessmentCriteriaScore.assessmentId,
			checklistAssessments.map((a) => a.id)
		)
	});

	// 3. Build block XMLs
	let concatenatedXml = '';
	for (const assess of checklistAssessments) {
		const sm = schedule.modules.find((m) => m.moduleId === assess.moduleId)!;
		const mObj = sm.module;

		// Group criteria by sectionLabel
		const criteriaBySection: Record<string, any[]> = {};
		for (const crit of mObj.criteria) {
			const label = crit.sectionLabel || '';
			if (!criteriaBySection[label]) criteriaBySection[label] = [];

			const scoreObj = criteriaScores.find(
				(cs) => cs.assessmentId === assess.id && cs.criteriaId === crit.id
			);

			criteriaBySection[label].push({
				name: crit.name,
				maxScore: crit.maxScore,
				score: scoreObj?.score ?? null
			});
		}

		const sections = Object.entries(criteriaBySection).map(([label, items]) => ({
			label: label || null,
			items
		}));

		// Compute sums
		let totalScore = 0;
		let totalMax = 0;
		for (const crit of mObj.criteria) {
			const scoreObj = criteriaScores.find(
				(cs) => cs.assessmentId === assess.id && cs.criteriaId === crit.id
			);
			totalScore += scoreObj?.score ?? 0;
			totalMax += crit.maxScore;
		}

		const moduleData: CslModuleData = {
			moduleName: mObj.name,
			scheduleDate: new Date(schedule.startTime).toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}),
			scoreLegend: mObj.scoreLegend as any,
			sections,
			totalScore,
			totalMax,
			comment: assess.notes
		};

		concatenatedXml += buildCslBlockXml(moduleData);
	}

	// 4. Load Word Template and execute docx-templates
	const templatePath = path.join(TEMPLATE_DIR, 'TEMPLATE_CSL_ASSESSMENT.docx');
	const templateData = await fs.readFile(templatePath);

	const outputBuffer = await generateReport({
		template: templateData,
		cmdDelimiter: ['{', '}'],
		literalXmlDelimiter: '||',
		data: {
			studentName: studentUser.name?.toUpperCase() ?? '-',
			className: schedule.class?.toUpperCase() ?? '-',
			scheduleDate: new Date(schedule.startTime).toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}),
			tableCsl: concatenatedXml
		}
	});

	// 5. Ensure output directory exists and save file
	const targetDir = path.join(GENERATED_DIR, studentId);
	await fs.mkdir(targetDir, { recursive: true });

	const formattedName = studentUser.name?.toLowerCase().replace(/[^a-z0-9]+/g, '_') ?? 'student';
	const fileName = `Penilaian_CSL_${formattedName}_${scheduleId.slice(0, 8)}.docx`;
	const outputPath = path.join(targetDir, fileName);

	await fs.writeFile(outputPath, outputBuffer);

	return {
		fileName,
		buffer: outputBuffer as Buffer
	};
}
