import { db } from '$lib/server/db';
import { safetyIncident, wasteLog, laboratorium, user } from '$lib/server/db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

	const incidents = await db.query.safetyIncident.findMany({
		with: {
			laboratorium: true
		},
		orderBy: [desc(safetyIncident.createdAt)]
	});

	const wasteLogs = await db.query.wasteLog.findMany({
		with: {
			laboratorium: true,
			pic: true
		},
		orderBy: [desc(wasteLog.createdAt)]
	});

	// Monthly Statistics
	const monthlyIncidents = incidents.filter((i) => {
		const d = new Date(i.incidentDate);
		return d >= startOfMonth && d <= endOfMonth;
	});

	const closedIncidentsCount = monthlyIncidents.filter((i) => i.status === 'CLOSED').length;
	const highSeverityIncidentsCount = monthlyIncidents.filter((i) => i.severity === 'HIGH').length;

	const monthlyWaste = wasteLogs.filter((w) => {
		if (!w.createdAt) return false;
		const d = new Date(w.createdAt);
		return d >= startOfMonth && d <= endOfMonth;
	});

	const totalWasteWeight = monthlyWaste.reduce((sum, w) => sum + w.weightGram, 0);

	return {
		incidents,
		wasteLogs,
		stats: {
			incidentsThisMonth: monthlyIncidents.length,
			closedIncidentsThisMonth: closedIncidentsCount,
			hasMajorIncident: highSeverityIncidentsCount > 0,
			totalWasteKg: totalWasteWeight / 1000,
			k3Compliance: 95
		}
	};
};
