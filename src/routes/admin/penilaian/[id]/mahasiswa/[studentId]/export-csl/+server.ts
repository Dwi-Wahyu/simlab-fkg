import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { practicumSchedule } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateCslAssessmentForStudent } from '$lib/server/csl/generateCslAssessment';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { id: scheduleId, studentId } = params;
	const instructorId = locals.user.id;

	const schedule = await db.query.practicumSchedule.findFirst({
		where: eq(practicumSchedule.id, scheduleId),
		with: {
			instructors: true
		}
	});

	if (!schedule) throw error(404, 'Schedule not found');

	const isInstructor = schedule.instructors.some((i) => i.instructorId === instructorId);
	const isKoordinator = locals.user.role === 'koordinator' && (!locals.user.laboratorium || schedule.laboratoriumId === locals.user.laboratorium.id);
	const isAuthorized = isInstructor || locals.user.role === 'superadmin' || isKoordinator;
	
	if (!isAuthorized) {
		throw error(403, 'Forbidden: You are not authorized to export this schedule assessments');
	}

	try {
		const { buffer, fileName } = await generateCslAssessmentForStudent(studentId, scheduleId);
		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'Content-Disposition': `attachment; filename="${fileName}"`
			}
		});
	} catch (err: any) {
		console.error(err);
		throw error(400, err.message || 'Gagal mengekspor data CSL.');
	}
};
