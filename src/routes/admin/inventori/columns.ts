import type { ColumnDef } from '@tanstack/table-core';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableActions from './data-table-actions.svelte';
import DataTableStatusBadge from './data-table-status-badge.svelte';

export type InventoryItem = {
	id: string;
	name: string;
	serialNumber?: string;
	category: string;
	location: string;
	stock: number | string;
	status: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'Tersedia' | 'Hampir Habis' | 'Habis' | 'READY' | 'IN_USE' | 'MAINTENANCE';
	lastCalibration: string;
	nextCalibration: string;
	type: 'ALAT' | 'BAHAN';
};

export const alatColumns: ColumnDef<InventoryItem>[] = [
	{
		accessorKey: 'name',
		header: 'Nama Alat'
	},
	{
		accessorKey: 'serialNumber',
		header: 'S/N'
	},
	{
		accessorKey: 'category',
		header: 'Kategori'
	},
	{
		accessorKey: 'location',
		header: 'Lokasi'
	},
	{
		accessorKey: 'status',
		header: 'Kondisi',
		cell: ({ row }) => {
			return renderComponent(DataTableStatusBadge, { status: row.original.status });
		}
	},
	{
		accessorKey: 'lastCalibration',
		header: 'Kalibrasi Terakhir'
	},
	{
		accessorKey: 'nextCalibration',
		header: 'Kalibrasi Berikutnya'
	},
	{
		id: 'actions',
		header: 'Aksi',
		cell: ({ row }) => {
			return renderComponent(DataTableActions, { id: row.original.id });
		}
	}
];

export const bahanColumns: ColumnDef<InventoryItem>[] = [
	{
		accessorKey: 'name',
		header: 'Nama Bahan'
	},
	{
		accessorKey: 'category',
		header: 'Kategori'
	},
	{
		accessorKey: 'location',
		header: 'Lokasi'
	},
	{
		accessorKey: 'stock',
		header: 'Stok'
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			return renderComponent(DataTableStatusBadge, { status: row.original.status });
		}
	},
	{
		id: 'actions',
		header: 'Aksi',
		cell: ({ row }) => {
			return renderComponent(DataTableActions, { id: row.original.id });
		}
	}
];

export const columns: ColumnDef<InventoryItem>[] = alatColumns; // Default
