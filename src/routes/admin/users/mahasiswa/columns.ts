import type { ColumnDef } from '@tanstack/table-core';

export type Student = {
	id: string;
	name: string;
	username: string;
	email: string;
	// We'll provide more detailed class info
	practicumClasses: {
		batch: string;
		name: string;
	}[];
};

export const columns: ColumnDef<Student>[] = [
	{
		accessorKey: 'name',
		header: 'Nama Mahasiswa'
	},
	{
		accessorKey: 'username',
		header: 'NIM / Username'
	},
	{
		id: 'batch',
		header: 'Angkatan',
		accessorFn: (row) => row.practicumClasses.map((pc) => pc.batch).join(', '),
		cell: ({ row }) => {
			const batches = [...new Set(row.original.practicumClasses.map((pc) => pc.batch))];
			return batches.join(', ') || '-';
		}
	},
	{
		id: 'className',
		header: 'Kelas',
		accessorFn: (row) => row.practicumClasses.map((pc) => pc.name).join(', '),
		cell: ({ row }) => {
			const names = row.original.practicumClasses.map((pc) => pc.name);
			return names.join(', ') || '-';
		}
	}
];
