import { createAccessControl } from 'better-auth/plugins/access';

// Menentukan apa saja yang bisa dilakukan (Permissions)
const statement = {
	member: ['create', 'update', 'delete', 'view'],
	inventory: ['create', 'update', 'delete', 'view'],
	report: ['generate', 'view']
} as const;

export const accessControl = createAccessControl(statement);

// Secara deklaratif mendefinisikan Role dan kemampuannya
export const superadmin = accessControl.newRole({
	inventory: ['create', 'update', 'view'],
	member: ['create', 'update', 'delete', 'view']
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
