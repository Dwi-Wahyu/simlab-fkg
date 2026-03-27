import { db } from '$lib/server/db';
import { distribution, organization } from '$lib/server/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) throw error(404, 'Kesatuan tidak ditemukan');

	const distributions = await db.query.distribution.findMany({
		where: or(
			eq(distribution.fromOrganizationId, org.id),
			eq(distribution.toOrganizationId, org.id)
		),
		with: {
			fromOrganization: true,
			toOrganization: true,
			requestedByUser: true,
			items: true
		},
		orderBy: [desc(distribution.createdAt)]
	});

	return {
		distributions,
		currentOrgId: org.id
	};
};
