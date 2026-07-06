import { createAccessControl } from 'better-auth/plugins/access';

// Menentukan apa saja yang bisa dilakukan (Permissions)
const statement = {
	member: ['create', 'update', 'delete', 'view'],
	inventory: ['create', 'update', 'delete', 'view'],
	report: ['generate', 'view'],
	user: [
		'create',
		'list',
		'set-role',
		'ban',
		'impersonate',
		'impersonate-admins',
		'delete',
		'set-password',
		'get',
		'update'
	],
	session: ['list', 'revoke', 'delete']
} as const;

export const accessControl = createAccessControl(statement);

// Secara deklaratif mendefinisikan Role dan kemampuannya
export const superadmin = accessControl.newRole({
	inventory: ['create', 'update', 'view'],
	member: ['create', 'update', 'delete', 'view'],
	user: [
		'create',
		'list',
		'set-role',
		'ban',
		'impersonate',
		'delete',
		'set-password',
		'get',
		'update'
	],
	session: ['list', 'revoke', 'delete']
});

export const koordinator = accessControl.newRole({
	inventory: ['create', 'update', 'view'],
	member: ['create']
});

export const kepalaLab = accessControl.newRole({
	inventory: ['view', 'update'],
	member: ['create']
});

export const instruktur = accessControl.newRole({
	inventory: ['view', 'update']
});

export const peneliti = accessControl.newRole({
	inventory: ['view', 'update']
});

export const teknisi = accessControl.newRole({
	inventory: ['view', 'update']
});

export const spmi = accessControl.newRole({
	inventory: ['view', 'update']
});

export const laboran = accessControl.newRole({
	inventory: ['create', 'update', 'delete', 'view']
});
