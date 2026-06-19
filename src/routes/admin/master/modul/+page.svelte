<script lang="ts">
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronUp,
		ChevronsLeft,
		ChevronsRight,
		FilterX,
		Pencil,
		Plus,
		Trash2
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let selectedDepartmentId = $state(data.filters.departmentId || '');
	let selectedBlockId = $state(data.filters.blockId || '');
	let showDeleteDialog = $state(false);
	let moduleToDelete = $state<{ id: string; name: string } | null>(null);
	let isDeleting = $state(false);
	let expandedItems = $state<Record<string, boolean>>({});

	$effect(() => {
		const deptId = data.filters.departmentId || '';
		const blockId = data.filters.blockId || '';
		if (selectedDepartmentId !== deptId) selectedDepartmentId = deptId;
		if (selectedBlockId !== blockId) selectedBlockId = blockId;
	});

	const departmentTrigger = $derived(
		data.departments.find((d) => d.id === selectedDepartmentId)?.name ?? 'Pilih Departemen'
	);

	const blockTrigger = $derived(
		data.blocks.find((b) => b.id === selectedBlockId)?.name ?? 'Pilih Blok'
	);

	async function handleFilter() {
		const url = new URL(page.url);
		if (selectedDepartmentId) url.searchParams.set('departmentId', selectedDepartmentId);
		else url.searchParams.delete('departmentId');

		if (selectedBlockId) url.searchParams.set('blockId', selectedBlockId);
		else url.searchParams.delete('blockId');

		// Reset to first page when filtering
		url.searchParams.set('page', '1');

		await goto(url.toString(), { keepFocus: true });
	}

	async function handlePageChange(newPage: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', newPage.toString());
		await goto(url.toString(), { keepFocus: true, scroll: false });
	}

	async function resetFilter() {
		selectedDepartmentId = '';
		selectedBlockId = '';
		const url = new URL(page.url);
		url.searchParams.delete('departmentId');
		url.searchParams.delete('blockId');
		url.searchParams.set('page', '1');
		await goto(url.toString());
	}

	function confirmDelete(id: string, name: string) {
		moduleToDelete = { id, name };
		showDeleteDialog = true;
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Modul Praktikum</h1>
			<p class="text-muted-foreground">Manajemen daftar modul praktikum laboratorium.</p>
		</div>
		<Button href="/admin/master/modul/tambah">
			<Plus class="mr-2 size-4" /> Tambah Modul
		</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Filter</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap items-end gap-4">
				<div class="grid w-full max-w-xs gap-1.5">
					<label for="department" class="text-sm font-medium">Departemen</label>
					<Select.Root
						type="single"
						bind:value={selectedDepartmentId}
						onValueChange={() => {
							selectedBlockId = '';
							handleFilter();
						}}
					>
						<Select.Trigger class="w-full text-left">
							{departmentTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each data.departments as dept (dept.id)}
								<Select.Item value={dept.id} label={dept.name}>{dept.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="grid w-full max-w-xs gap-1.5">
					<label for="block" class="text-sm font-medium">Blok</label>
					<Select.Root type="single" bind:value={selectedBlockId} onValueChange={handleFilter}>
						<Select.Trigger class="w-full text-left">
							{blockTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each data.blocks as block (block.id)}
								<Select.Item value={block.id} label={block.name}>{block.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<Button variant="outline" onclick={resetFilter}>
					<FilterX class="mr-2 size-4" /> Reset
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="rounded-md border bg-white shadow-sm">
		<Table.Root class="block md:table">
			<Table.Header class="hidden md:table-header-group">
				<Table.Row class="md:table-row">
					<Table.Head class="px-6 py-4">Nama Modul</Table.Head>
					<Table.Head>Departemen</Table.Head>
					<Table.Head>Blok</Table.Head>
					<Table.Head>Deskripsi</Table.Head>
					<Table.Head class="pr-6 text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body class="block md:table-row-group">
				{#if data.modules.length === 0}
					<Table.Row class="flex flex-col md:table-row">
						<Table.Cell colspan={5} class="py-10 text-center text-muted-foreground md:table-cell">
							Data tidak ditemukan.
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each data.modules as module (module.id)}
						<Table.Row
							class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
						>
							<!-- Nama Modul + Mobile status/expand -->
							<Table.Cell
								class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
							>
								<div class="flex flex-col">
									<span class="font-bold text-slate-900 md:font-medium">{module.name}</span>
									<span class="mt-0.5 text-xs text-muted-foreground uppercase md:hidden">
										{module.blockName}
									</span>
								</div>
								<Button
									variant="ghost"
									size="icon"
									class="ml-4 h-8 w-8 shrink-0 md:hidden"
									onclick={() => (expandedItems[module.id] = !expandedItems[module.id])}
									aria-label="Expand row"
								>
									{#if expandedItems[module.id]}
										<ChevronUp class="h-4 w-4" />
									{:else}
										<ChevronDown class="h-4 w-4" />
									{/if}
								</Button>
							</Table.Cell>

							<!-- Departemen -->
							<Table.Cell
								class={cn(
									expandedItems[module.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Departemen</span>
								<span class="text-sm text-slate-600">{module.departmentName}</span>
							</Table.Cell>

							<!-- Blok -->
							<Table.Cell
								class={cn(
									expandedItems[module.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Blok</span>
								<span class="text-sm text-slate-600">{module.blockName}</span>
							</Table.Cell>

							<!-- Deskripsi -->
							<Table.Cell
								class={cn(
									expandedItems[module.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Deskripsi</span>
								<span class="text-sm text-slate-600 line-clamp-2 md:line-clamp-none"
									>{module.description ?? '-'}</span
								>
							</Table.Cell>

							<!-- Aksi -->
							<Table.Cell
								class={cn(
									expandedItems[module.id] ? 'flex' : 'hidden',
									'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4 md:text-right'
								)}
							>
								<div class="flex justify-end gap-2">
									<Button variant="ghost" size="icon" href="/admin/master/modul/{module.id}/edit">
										<Pencil class="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => confirmDelete(module.id, module.name)}
									>
										<Trash2 class="size-4 text-destructive" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>

		<div class="flex items-center justify-between border-t px-4 py-4">
			<div class="text-sm text-muted-foreground">
				Menampilkan {(data.pagination.currentPage - 1) * data.pagination.pageSize + 1} sampai {Math.min(
					data.pagination.currentPage * data.pagination.pageSize,
					data.pagination.totalModules
				)} dari {data.pagination.totalModules} modul
			</div>
			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					size="icon"
					class="hidden h-8 w-8 lg:flex"
					onclick={() => handlePageChange(1)}
					disabled={data.pagination.currentPage === 1}
				>
					<ChevronsLeft class="size-4" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
					onclick={() => handlePageChange(data.pagination.currentPage - 1)}
					disabled={data.pagination.currentPage === 1}
				>
					<ChevronLeft class="size-4" />
				</Button>
				<div class="flex items-center justify-center text-sm font-medium">
					Halaman {data.pagination.currentPage} dari {data.pagination.totalPages}
				</div>
				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
					onclick={() => handlePageChange(data.pagination.currentPage + 1)}
					disabled={data.pagination.currentPage === data.pagination.totalPages}
				>
					<ChevronRight class="size-4" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					class="hidden h-8 w-8 lg:flex"
					onclick={() => handlePageChange(data.pagination.totalPages)}
					disabled={data.pagination.currentPage === data.pagination.totalPages}
				>
					<ChevronsRight class="size-4" />
				</Button>
			</div>
		</div>
	</div>
</div>

<ConfirmationDialog
	bind:open={showDeleteDialog}
	type="error"
	title="Hapus Modul"
	description="Apakah Anda yakin ingin menghapus modul '{moduleToDelete?.name}'? Tindakan ini tidak dapat dibatalkan."
	actionLabel="Hapus"
	loading={isDeleting}
	onAction={() => {
		const form = document.getElementById('delete-form') as HTMLFormElement;
		form?.requestSubmit();
	}}
/>

<form
	id="delete-form"
	method="POST"
	action="?/delete"
	use:enhance={() => {
		isDeleting = true;
		return async ({ result, update }) => {
			isDeleting = false;
			showDeleteDialog = false;
			if (result.type === 'success') {
				await update();
			}
		};
	}}
	class="hidden"
>
	<input type="hidden" name="id" value={moduleToDelete?.id} />
</form>
