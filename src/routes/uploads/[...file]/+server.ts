import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.resolve('static/uploads');

export const GET: RequestHandler = async ({ params, locals }) => {
	// Keamanan: Cek apakah user sudah terautentikasi
	if (!locals.user) throw error(401, 'Unauthorized');

	const filePath = path.join(UPLOADS_DIR, params.file);

	// Proteksi dari directory traversal (keamanan folder)
	const resolvedPath = path.resolve(filePath);
	if (!resolvedPath.startsWith(UPLOADS_DIR)) {
		throw error(400, 'Invalid path');
	}

	try {
		const buffer = await readFile(resolvedPath);

		// Tentukan content type berdasarkan ekstensi file
		let contentType = 'application/octet-stream';
		const ext = path.extname(resolvedPath).toLowerCase();
		if (ext === '.pdf') {
			contentType = 'application/pdf';
		} else if (ext === '.jpg' || ext === '.jpeg') {
			contentType = 'image/jpeg';
		} else if (ext === '.png') {
			contentType = 'image/png';
		} else if (ext === '.webp') {
			contentType = 'image/webp';
		} else if (ext === '.docx') {
			contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		} else if (ext === '.xlsx') {
			contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
		}

		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': contentType
			}
		});
	} catch {
		throw error(404, 'File tidak ditemukan');
	}
};
