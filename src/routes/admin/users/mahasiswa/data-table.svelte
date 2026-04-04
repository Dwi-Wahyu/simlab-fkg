<script lang="ts" generics="TData, TValue">
	import {
		type ColumnDef,
		type PaginationState,
		type SortingState,
		type ColumnFiltersState,
		getCoreRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		getFilteredRowModel
	} from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index';
	import { Trash2 } from '@lucide/svelte';

	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		filterOptions?: {
			batches: string[];
			classNames: string[];
		};
	};

	let { data, columns, filterOptions }: DataTableProps<TData, TValue> = $props();

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		get columns() {
			return columns;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			}
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	});

	function resetFilters() {
		batchValue = 'ALL';
		classNameValue = 'ALL';
		table.getColumn('name')?.setFilterValue('');
	}

	let batchValue = $state('ALL');
	let classNameValue = $state('ALL');

	$effect(() => {
		table.getColumn('batch')?.setFilterValue(batchValue === 'ALL' ? '' : batchValue);
	});

	$effect(() => {
		table.getColumn('className')?.setFilterValue(classNameValue === 'ALL' ? '' : classNameValue);
	});

	// Derived labels for Select triggers
	const batchLabel = $derived(
		batchValue === 'ALL' ? 'Semua Angkatan' : batchValue
	);
	
	const classLabel = $derived(
		classNameValue === 'ALL' ? 'Semua Kelas' : classNameValue
	);
</script>

<div class="w-full space-y-4">
	<div class="flex flex-wrap items-center gap-4">
		<div class="relative w-full max-w-sm">
			<Input
				placeholder="Cari nama mahasiswa..."
				value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
				oninput={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
				class="w-full"
			/>
		</div>

		{#if filterOptions}
			<div class="flex items-center gap-2">
				<Select.Root type="single" bind:value={batchValue}>
					<Select.Trigger class="w-[180px]">
						<Select.Value placeholder="Pilih Angkatan" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL" label="Semua Angkatan">Semua Angkatan</Select.Item>
						{#each filterOptions.batches as batch (batch)}
							<Select.Item value={batch} label={batch}>{batch}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<Select.Root type="single" bind:value={classNameValue}>
					<Select.Trigger class="w-[180px]">
						<Select.Value placeholder="Pilih Kelas" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL" label="Semua Kelas">Semua Kelas</Select.Item>
						{#each filterOptions.classNames as name (name)}
							<Select.Item value={name} label={name}>{name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}

		{#if columnFilters.length > 0 || batchValue !== 'ALL' || classNameValue !== 'ALL'}
			<Button variant="ghost" onclick={resetFilters} class="h-9 px-2 lg:px-3 text-muted-foreground">
				Reset Filter
				<Trash2 class="ml-2 h-4 w-4" />
			</Button>
		{/if}
	</div>

	<div class="rounded-md border bg-white">
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							<Table.Head colspan={header.colSpan}>
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#each table.getRowModel().rows as row (row.id)}
					<Table.Row data-state={row.getIsSelected() && 'selected'}>
						{#each row.getVisibleCells() as cell (cell.id)}
							<Table.Cell>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</Table.Cell>
						{/each}
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">
							Tidak ada data mahasiswa ditemukan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex items-center justify-end space-x-2 py-4">
		<div class="flex-1 text-sm text-muted-foreground">
			Menampilkan {table.getRowModel().rows.length} dari {data.length} mahasiswa
		</div>
		<div class="space-x-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
			>
				Sebelumnya
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}
			>
				Selanjutnya
			</Button>
		</div>
	</div>
</div>
