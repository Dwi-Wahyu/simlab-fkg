const NEW_ITEM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 1 minggu

export function isWithinNewItemWindow(
	createdAt: string | Date | null | undefined
): boolean {
	if (!createdAt) return false;
	const createdDate = new Date(createdAt);
	if (isNaN(createdDate.getTime())) return false;
	const diff = Date.now() - createdDate.getTime();
	return diff >= -24 * 60 * 60 * 1000 && diff <= NEW_ITEM_WINDOW_MS;
}

// Dipakai khusus untuk badge level Item (BHP/Alat) yang bisa dinonaktifkan manual
export function shouldShowNewBadge(
	createdAt: string | Date | null | undefined,
	hideNewBadge: boolean | null | undefined
): boolean {
	if (hideNewBadge) return false;
	return isWithinNewItemWindow(createdAt);
}
