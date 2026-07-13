import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { practicumLogbookGeneration } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';

const GENERATED_DIR = path.resolve('static/generated/logbook');

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const lastGen = await db.query.practicumLogbookGeneration.findFirst({
		where: and(
			eq(practicumLogbookGeneration.userId, locals.user.id),
			eq(practicumLogbookGeneration.seriesId, params.seriesId)
		)
	});

	if (!lastGen?.generatedFileName) throw error(404, 'Logbook belum pernah digenerate');

	try {
		let buffer: Buffer;
		try {
			buffer = await readFile(path.join(GENERATED_DIR, lastGen.userId, lastGen.generatedFileName));
		} catch {
			buffer = await readFile(path.join(GENERATED_DIR, lastGen.generatedFileName));
		}
		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'Content-Disposition': `attachment; filename="${lastGen.generatedFileName}"`
			}
		});
	} catch {
		throw error(404, 'File logbook tidak ditemukan di server');
	}
};
