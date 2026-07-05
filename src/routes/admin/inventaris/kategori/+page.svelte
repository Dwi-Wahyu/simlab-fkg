<script lang="ts">
	import { Calendar, Pencil, Plus, Tag, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/components/toast';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';

	let { data, form } = $props();

	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);

	let categoryName = $state('');
	let categoryDescription = $state('');
	let selectedCategory = $state<any>(null);

	function openEditModal(cat: any) {
		selectedCategory = cat;
		categoryName = cat.name;
		categoryDescription = cat.description || '';
		isEditModalOpen = true;
	}

	function openDeleteModal(cat: any) {
		selectedCategory = cat;
		isDeleteModalOpen = true;
	}

	function handleActionSubmit() {
		return async ({ result }: any) => {
			if (result.type === 'success' || result.type === 'redirect' || result.data?.success) {
				const msg = result.data?.message || 'Aksi berhasil dilakukan';
				toast.success('Berhasil', { description: msg });
				isCreateModalOpen = false;
				isEditModalOpen = false;
				isDeleteModalOpen = false;
				// Reset form fields
				categoryName = '';
				categoryDescription = '';
				selectedCategory = null;
			} else if (result.type === 'failure') {
				const errMsg = result.data?.message || 'Terjadi kesalahan.';
				toast.destructive('Gagal', { description: errMsg });
			}
		};
	}
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Kategori Item</h1>
			<p class="text-slate-500">Kelola kategori untuk pengelompokan alat dan bahan habis pakai.</p>
		</div>
		<Button
			onclick={() => {
				categoryName = '';
				categoryDescription = '';
				isCreateModalOpen = true;
			}}
			class="w-full gap-2 bg-[#2D5A43] text-white hover:bg-[#234735] sm:w-auto"
		>
			<Plus class="size-4" />
			Tambah Kategori
		</Button>
	</div>

	<Card.Root class="p-0">
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nama Kategori</Table.Head>
						<Table.Head>Deskripsi</Table.Head>
						<Table.Head class="text-center">Jumlah Item Terkait</Table.Head>
						<Table.Head>Tanggal Dibuat</Table.Head>
						<Table.Head class="w-[100px] text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.categories.length === 0}
						<Table.Row>
							<Table.Cell colspan={6} class="h-24 text-center text-slate-500">
								Belum ada kategori yang terdaftar.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.categories as cat (cat.id)}
							<Table.Row>
								<Table.Cell class="font-medium text-slate-900">{cat.name}</Table.Cell>
								<Table.Cell class="max-w-md truncate text-slate-600"
									>{cat.description || '-'}</Table.Cell
								>
								<Table.Cell class="text-center">
									<span
										class="inline-flex items-center rounded-full bg-[#f0f5ed] px-2.5 py-0.5 text-xs font-semibold text-[#006a34]"
									>
										{cat.items?.length || 0} Item
									</span>
								</Table.Cell>
								<Table.Cell class="text-sm text-slate-500">
									<div class="flex items-center gap-1.5">
										<Calendar class="size-3.5 text-slate-400" />
										{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
											new Date(cat.createdAt)
										)}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button size="icon" variant="ghost" onclick={() => openEditModal(cat)}>
											<Pencil class="size-4 text-slate-600" />
										</Button>
										<Button size="icon" variant="ghost" onclick={() => openDeleteModal(cat)}>
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

<!-- Modal Tambah -->
<Dialog.Root bind:open={isCreateModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Tambah Kategori</Dialog.Title>
			<Dialog.Description>Masukkan detail kategori baru di bawah ini.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" use:enhance={handleActionSubmit} class="grid gap-4 py-4">
			<input type="hidden" name="action" value="create" />
			<div class="grid gap-2">
				<Label for="create-name">Nama Kategori</Label>
				<Input
					id="create-name"
					name="name"
					bind:value={categoryName}
					placeholder="Contoh: Kaca Mulut"
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label for="create-description">Deskripsi (Opsional)</Label>
				<Textarea
					id="create-description"
					name="description"
					bind:value={categoryDescription}
					placeholder="Deskripsi singkat..."
				/>
			</div>
			<Dialog.Footer class="mt-4">
				<Button type="button" variant="outline" onclick={() => (isCreateModalOpen = false)}
					>Batal</Button
				>
				<Button type="submit" class="bg-[#2D5A43] text-white hover:bg-[#234735]">Simpan</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Modal Edit -->
<Dialog.Root bind:open={isEditModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Edit Kategori</Dialog.Title>
			<Dialog.Description>Perbarui data kategori di bawah ini.</Dialog.Description>
		</Dialog.Header>
		{#if selectedCategory}
			<form method="POST" use:enhance={handleActionSubmit} class="grid gap-4 py-4">
				<input type="hidden" name="action" value="update" />
				<input type="hidden" name="id" value={selectedCategory.id} />
				<div class="grid gap-2">
					<Label for="edit-name">Nama Kategori</Label>
					<Input
						id="edit-name"
						name="name"
						bind:value={categoryName}
						placeholder="Contoh: Kaca Mulut"
						required
					/>
				</div>
				<div class="grid gap-2">
					<Label for="edit-description">Deskripsi (Opsional)</Label>
					<Textarea
						id="edit-description"
						name="description"
						bind:value={categoryDescription}
						placeholder="Deskripsi singkat..."
					/>
				</div>
				<Dialog.Footer class="mt-4">
					<Button type="button" variant="outline" onclick={() => (isEditModalOpen = false)}
						>Batal</Button
					>
					<Button type="submit" class="bg-[#2D5A43] text-white hover:bg-[#234735]">Perbarui</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Modal Konfirmasi Hapus -->
<Dialog.Root bind:open={isDeleteModalOpen}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>Hapus Kategori</Dialog.Title>
			<Dialog.Description>
				Apakah Anda yakin ingin menghapus kategori ini? Tindakan ini tidak dapat dibatalkan.
			</Dialog.Description>
		</Dialog.Header>
		{#if selectedCategory}
			<form method="POST" use:enhance={handleActionSubmit} class="space-y-4">
				<input type="hidden" name="action" value="delete" />
				<input type="hidden" name="id" value={selectedCategory.id} />
				<div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
					<div class="text-sm font-semibold text-slate-900">{selectedCategory.name}</div>
					<div class="mt-1 text-xs text-slate-500">
						{selectedCategory.description || 'Tidak ada deskripsi'}
					</div>
					<div class="mt-2 text-xs font-medium text-amber-700">
						* {selectedCategory.items?.length || 0} item sedang terhubung dengan kategori ini.
					</div>
				</div>
				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (isDeleteModalOpen = false)}
						>Batal</Button
					>
					<Button type="submit" variant="destructive">Hapus</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
