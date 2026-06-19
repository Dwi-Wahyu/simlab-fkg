import type { RequestHandler } from './$types';
import { generateLogbookForSeries } from '$lib/server/logbook/generateLogbook';
import { db } from '$lib/server/db';
import { practicumLogbookGeneration } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 menit

export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const currentUser = locals.user;

	const { seriesId } = params;

	// Cek cooldown jika bukan mode development
	if (env.NODE_ENV !== 'development') {
		const lastGen = await db.query.practicumLogbookGeneration.findFirst({
			where: and(
				eq(practicumLogbookGeneration.userId, currentUser.id),
				eq(practicumLogbookGeneration.seriesId, seriesId)
			)
		});

		if (lastGen) {
			const elapsed = Date.now() - new Date(lastGen.generatedAt).getTime();
			if (elapsed < COOLDOWN_MS) {
				const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
				return json({ message: 'Terlalu cepat', remainingSeconds }, { status: 429 });
			}
		}
	}

	let manualInputs = {};
	try {
		const body = await request.json().catch(() => ({}));
		manualInputs = body.manualInputs ?? {};
	} catch {
		// default to empty object
	}

	try {
		const { buffer, fileName } = await generateLogbookForSeries(
			currentUser.id,
			seriesId,
			manualInputs
		);

		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'Content-Disposition': `attachment; filename="${fileName}"`
			}
		});
	} catch (err: any) {
		console.error('[API LOGBOOK DOWNLOAD ERROR]', err);
		throw error(500, err.message ?? 'Gagal generate logbook');
	}
};
