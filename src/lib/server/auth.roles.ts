import { createAccessControl } from 'better-auth/plugins/access';

// Menentukan apa saja yang bisa dilakukan (Permissions)
const statement = {
	kelompokMahasiswa: ['create', 'update', 'delete', 'view'],
	member: ['create', 'update', 'delete', 'view'],
	item: ['create', 'update', 'delete', 'view'],
	equipment: ['create', 'update', 'delete', 'view'],
	inventoryReport: ['generate', 'view'],
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
	item: ['create', 'update', 'view'],
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
	item: ['create', 'update', 'view'],
	member: ['create'],
	kelompokMahasiswa: ['view']
});

export const kepalaLab = accessControl.newRole({
	item: ['view', 'update'],
	member: ['create']
});

export const dosen = accessControl.newRole({
	item: ['view', 'update'],
	user: ['get'],
	kelompokMahasiswa: ['view']
});

export const mahasiswa = accessControl.newRole({
	item: ['view', 'update']
});

export const teknisi = accessControl.newRole({
	item: ['view', 'update']
});

export const spmi = accessControl.newRole({
	item: ['view', 'update']
});

export const laboran = accessControl.newRole({
	item: ['create', 'update', 'delete', 'view']
});

export const rolesMap = {
	superadmin,
	koordinator,
	kepalaLab,
	dosen,
	mahasiswa,
	teknisi,
	spmi,
	laboran
} as const;

export type RoleName = keyof typeof rolesMap;
