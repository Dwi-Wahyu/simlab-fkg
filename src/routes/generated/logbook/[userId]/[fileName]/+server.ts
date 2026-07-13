import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import path from 'path';

const GENERATED_DIR = path.resolve('static/generated/logbook');

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const { userId, fileName } = params;

	// Keamanan: Cek apakah user yang login adalah pemilik logbook tersebut, atau admin/staff
	const isOwner = locals.user.id === userId;
	const isAdminOrStaff = [
		'superadmin',
		'koordinator',
		'kepalaLab',
		'instruktur',
		'teknisi'
	].includes(locals.user.role || '');

	if (!isOwner && !isAdminOrStaff) {
		throw error(403, 'Forbidden');
	}

	const filePath = path.join(GENERATED_DIR, userId, fileName);

	// Proteksi dari directory traversal
	const resolvedPath = path.resolve(filePath);
	if (!resolvedPath.startsWith(GENERATED_DIR)) {
		throw error(400, 'Invalid path');
	}

	try {
		const buffer = await readFile(resolvedPath);

		let contentType = 'application/octet-stream';
		if (fileName.endsWith('.pdf')) {
			contentType = 'application/pdf';
		} else if (fileName.endsWith('.docx')) {
			contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		}

		return new Response(new Uint8Array(buffer), {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `inline; filename="${fileName}"`
			}
		});
	} catch {
		throw error(404, 'File logbook tidak ditemukan');
	}
};
