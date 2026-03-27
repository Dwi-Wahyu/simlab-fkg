import { db } from '$lib/server/db';
import { lending, member } from '$lib/server/db/schema';
import { eq, or, desc, and, like, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user: currentUser } = locals;

	if (!currentUser || !currentUser.organization) return { status: 401 };

	const searchQuery = url.searchParams.get('q') || '';
	const statusFilter = url.searchParams.get('status') || 'ALL';

	// Dapatkan semua user ID yang berada di organisasi yang sama dengan currentUser
	const orgUserIdsSubquery = db
		.select({ id: member.userId })
		.from(member)
		.where(eq(member.organizationId, currentUser.organization.id));

	// Query peminjaman dimana organisasi user adalah:
	// 1. Pemberi pinjaman (organizationId adalah organisasi ini)
	// 2. Pemohon (requestedBy berasal dari anggota organisasi ini)

	const filters = [
		or(
			eq(lending.organizationId, currentUser.organization.id),
			inArray(lending.requestedBy, orgUserIdsSubquery)
		)
	];

	if (statusFilter !== 'ALL') {
		filters.push(eq(lending.status, statusFilter as any));
	}

	if (searchQuery) {
		filters.push(like(lending.unit, `%${searchQuery}%`));
	}

	const data = await db.query.lending.findMany({
		where: and(...filters),
		with: {
			organization: true,
			requestedByUser: {
				columns: { name: true }
			}
		},
		orderBy: [desc(lending.createdAt)]
	});

	return {
		lendingList: data,
		filters: { q: searchQuery, status: statusFilter }
	};
};
