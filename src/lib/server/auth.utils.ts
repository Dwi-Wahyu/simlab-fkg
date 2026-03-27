import { error } from '@sveltejs/kit';
import { accessControl } from './auth.roles';

/**
 * Memastikan user sudah login. Jika tidak, lempar error 401.
 */
export function requireAuth(locals: App.Locals) {
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized: Silakan login terlebih dahulu');
	}
	return { session: locals.session, user: locals.user };
}

/**
 * Memastikan user memiliki role tertentu. Jika tidak, lempar error 403.
 */
export function requireRole(locals: App.Locals, roles: string | string[]) {
	const { user } = requireAuth(locals);

	const allowedRoles = Array.isArray(roles) ? roles : [roles];

	if (!allowedRoles.includes(user.role)) {
		throw error(403, `Forbidden: Anda tidak memiliki akses (${user.role} tidak diizinkan)`);
	}

	return { user };
}

/**
 * Memastikan user memiliki permission tertentu berdasarkan Access Control (RBAC).
 * Contoh: requirePermission(locals, 'inventory', 'create')
 */
export function requirePermission(
	locals: App.Locals,
	resource: keyof typeof accessControl.schema,
	action: string
) {
	const { user } = requireAuth(locals);

	// Cek apakah role user memiliki permission untuk resource dan action tersebut
	// @ts-ignore - accessControl.check is dynamic based on schema
	const hasPermission = accessControl.check(user.role, resource, action);

	if (!hasPermission) {
		throw error(403, `Forbidden: Role ${user.role} tidak memiliki izin ${action} pada ${resource}`);
	}

	return { user };
}
