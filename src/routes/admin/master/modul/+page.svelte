<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus, Trash2, Search, FilterX, Pencil } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { enhance } from '$app/forms';

	let { data } = $props();

	let selectedDepartmentId = $state(data.filters.departmentId || '');
	let selectedBlockId = $state(data.filters.blockId || '');
	let showDeleteDialog = $state(false);
	let moduleToDelete = $state<{ id: string; name: string } | null>(null);
	let isDeleting = $state(false);

	const departmentTrigger = $derived(
		data.departments.find((d) => d.id === selectedDepartmentId)?.name ?? 'Pilih Departemen'
	);

	const blockTrigger = $derived(
		data.blocks.find((b) => b.id === selectedBlockId)?.name ?? 'Pilih Blok'
	);

	function handleFilter() {
		const url = new URL(page.url);
		if (selectedDepartmentId) url.searchParams.set('departmentId', selectedDepartmentId);
		else url.searchParams.delete('departmentId');

		if (selectedBlockId) url.searchParams.set('blockId', selectedBlockId);
		else url.searchParams.delete('blockId');

		goto(url.toString(), { keepFocus: true });
	}

	function resetFilter() {
		selectedDepartmentId = '';
		selectedBlockId = '';
		goto(page.url.pathname);
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

	<Card.Root>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nama Modul</Table.Head>
						<Table.Head>Departemen</Table.Head>
						<Table.Head>Blok</Table.Head>
						<Table.Head>Deskripsi</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.modules.length === 0}
						<Table.Row>
							<Table.Cell colspan={5} class="h-24 text-center">Data tidak ditemukan.</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.modules as module (module.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{module.name}</Table.Cell>
								<Table.Cell>{module.departmentName}</Table.Cell>
								<Table.Cell>{module.blockName}</Table.Cell>
								<Table.Cell class="max-w-xs truncate">{module.description ?? '-'}</Table.Cell>
								<Table.Cell class="text-right">
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
		</Card.Content>
	</Card.Root>
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
