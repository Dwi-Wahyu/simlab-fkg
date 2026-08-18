import { error } from '@sveltejs/kit';
import { accessControl, rolesMap, type RoleName } from './auth.roles';

// Ekstrak tipe resource dan action dari definisi statement
type Resource = keyof typeof accessControl.statements;
type Action = string; // Anda bisa memperketat typing jika perlu

/**
 * Fungsi ini mengecek apakah user memiliki izin untuk resource dan action tertentu.
 */
export function hasPermission(
	roleName: string | null | undefined,
	resource: Resource,
	action: Action
): boolean {
	if (!roleName) return false;

	const roleDef = rolesMap[roleName as RoleName];
	if (!roleDef) return false;

	// Better Auth menyimpan aturan di dalam object `statements` pada roleDef
	const permissions = roleDef.statements?.[resource] || roleDef[resource];
	return permissions?.includes(action) || permissions?.includes('*') || false;
}

/**
 * Middleware SvelteKit: Langsung melempar error 403 Forbidden jika ditolak
 */
export function requirePermission(
	roleName: string | null | undefined,
	resource: Resource,
	action: Action
) {
	if (!hasPermission(roleName, resource, action)) {
		throw error(
			403,
			`Forbidden: Anda tidak memiliki akses '${action}' pada resource '${resource}'.`
		);
	}
}
