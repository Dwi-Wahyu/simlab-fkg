<script lang="ts">
	import { Plus, Pencil, Trash2, Users, Calendar } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/components/toast';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);

	let groupName = $state('');
	let selectedClassId = $state('');
	let selectedGroup = $state<any>(null);

	const selectedClassName = $derived(
		data.classes.find((c: any) => c.id === selectedClassId)?.name ?? 'Pilih Kelas'
	);

	function openEditModal(group: any) {
		selectedGroup = group;
		groupName = group.name;
		selectedClassId = group.classId;
		isEditModalOpen = true;
	}

	function openDeleteModal(group: any) {
		selectedGroup = group;
		isDeleteModalOpen = true;
	}

	function handleActionSubmit() {
		return async ({ result, update }: any) => {
			if (result.type === 'success' || result.type === 'redirect' || result.data?.success) {
				const msg = result.data?.message || 'Aksi berhasil dilakukan';
				toast.success('Berhasil', { description: msg });
				isCreateModalOpen = false;
				isEditModalOpen = false;
				isDeleteModalOpen = false;
				// Reset form fields
				groupName = '';
				selectedClassId = '';
				selectedGroup = null;
				await update();
			} else if (result.type === 'failure') {
				const errMsg = result.data?.message || 'Terjadi kesalahan.';
				toast.destructive('Gagal', { description: errMsg });
			}
		};
	}

	let searchQuery = $state(page.url.searchParams.get('search') || '');
	let debounceTimer: any;

	import { untrack } from 'svelte';
	import { Search, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, ChevronsLeft, ChevronsRight, XCircle } from '@lucide/svelte';

	function updateUrl(params: Record<string, string | number | undefined>) {
		const url = new URL(page.url);
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === '') {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, value.toString());
			}
		});
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateUrl({ search: searchQuery, page: 1 });
		}, 300);
	}

	function handleClassFilter(value: string | undefined) {
		updateUrl({ classId: value, page: 1 });
	}

	function handlePageChange(newPage: number) {
		updateUrl({ page: newPage });
	}

	function handleLimitChange(newLimit: string) {
		updateUrl({ limit: newLimit, page: 1 });
	}

	$effect(() => {
		const urlSearch = page.url.searchParams.get('search') || '';
		untrack(() => {
			if (searchQuery !== urlSearch) {
				searchQuery = urlSearch;
			}
		});
	});

	const filterClassName = $derived(
		data.classes.find((c: any) => c.id === data.selectedClassId)?.name ?? 'Semua Kelas'
	);
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="space-y-1">
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Kelompok Mahasiswa</h1>
			<p class="text-slate-500">Kelola pembagian kelompok belajar mahasiswa berdasarkan kelas praktikum.</p>
		</div>
		<Button onclick={() => {
			groupName = '';
			selectedClassId = data.selectedClassId || (data.classes[0]?.id ?? '');
			isCreateModalOpen = true;
		}} class="w-full sm:w-auto bg-[#2D5A43] text-white hover:bg-[#234735] gap-2">
			<Plus class="size-4" />
			Tambah Kelompok
		</Button>
	</div>

	<!-- Filter & Search Section -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-4 bg-white p-4 rounded-lg border w-full sm:w-auto">
			<Label class="text-sm font-medium text-slate-700 whitespace-nowrap">Filter Kelas:</Label>
			<Select.Root type="single" value={data.selectedClassId} onValueChange={handleClassFilter}>
				<Select.Trigger class="w-[200px] bg-white">
					{data.selectedClassId ? `${filterClassName}` : 'Semua Kelas'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="" label="Semua Kelas">Semua Kelas</Select.Item>
					{#each data.classes as cls}
						<Select.Item value={cls.id} label={`${cls.name} (${cls.batch})`}>
							{cls.name} ({cls.batch})
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div class="relative w-full sm:max-w-xs">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
			<Input
				placeholder="Cari kelompok..."
				class="pl-10 bg-white"
				bind:value={searchQuery}
				oninput={handleSearch}
			/>
		</div>
	</div>

	{#await data.groupsPromise}
		<!-- Skeleton Table -->
		<Card.Root>
			<Card.Content class="p-0">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[50px]"></Table.Head>
							<Table.Head>Nama Kelompok</Table.Head>
							<Table.Head>Kelas Praktikum</Table.Head>
							<Table.Head class="text-center">Jumlah Anggota</Table.Head>
							<Table.Head>Tanggal Dibuat</Table.Head>
							<Table.Head class="w-[150px] text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each Array(5) as _}
							<Table.Row>
								{#each Array(6) as _}
									<Table.Cell>
										<div class="h-5 w-full animate-pulse rounded bg-slate-100"></div>
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{:then res}
		<Card.Root>
			<Card.Content class="p-0">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-[50px]"></Table.Head>
							<Table.Head>Nama Kelompok</Table.Head>
							<Table.Head>Kelas Praktikum</Table.Head>
							<Table.Head class="text-center">Jumlah Anggota</Table.Head>
							<Table.Head>Tanggal Dibuat</Table.Head>
							<Table.Head class="w-[150px] text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if res.items.length === 0}
							<Table.Row>
								<Table.Cell colspan={6} class="h-24 text-center text-slate-500">
									Belum ada kelompok yang terdaftar.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each res.items as group (group.id)}
								<Table.Row>
									<Table.Cell>
										<div class="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
											<Users class="size-4" />
										</div>
									</Table.Cell>
									<Table.Cell class="font-medium text-slate-900">
										<a href="/admin/kelompok-mahasiswa/{group.id}" class="hover:underline text-[#2D5A43] font-semibold">
											{group.name}
										</a>
									</Table.Cell>
									<Table.Cell class="text-slate-600">
										{group.class?.name} ({group.class?.batch})
									</Table.Cell>
									<Table.Cell class="text-center text-slate-900 font-semibold">
										{group.members?.length || 0} Mahasiswa
									</Table.Cell>
									<Table.Cell class="text-slate-600">
										<div class="flex items-center gap-1.5 text-xs">
											<Calendar class="size-3.5 text-slate-400" />
											{new Date(group.createdAt).toLocaleDateString('id-ID', {
												day: 'numeric',
												month: 'short',
												year: 'numeric'
											})}
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-2">
											<Button
												href="/admin/kelompok-mahasiswa/{group.id}"
												variant="outline"
												size="sm"
											>
												Detail
											</Button>
											<Button
												onclick={() => openEditModal(group)}
												variant="outline"
												size="sm"
												class="text-slate-700 hover:text-slate-900"
											>
												<Pencil class="size-3.5" />
											</Button>
											<Button
												onclick={() => openDeleteModal(group)}
												variant="outline"
												size="sm"
												class="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
											>
												<Trash2 class="size-3.5" />
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

		<!-- Pagination & Limit -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
			<div class="text-sm text-slate-500">
				Menampilkan {(res.pagination.currentPage - 1) * res.pagination.limit + 1} sampai {Math.min(
					res.pagination.currentPage * res.pagination.limit,
					res.pagination.totalItems
				)} dari {res.pagination.totalItems} kelompok
			</div>

			<div class="flex items-center gap-4">
				<Select.Root
					type="single"
					value={res.pagination.limit.toString()}
					onValueChange={handleLimitChange}
				>
					<Select.Trigger class="w-[110px] bg-white text-xs">
						{res.pagination.limit} / Hal
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10" label="10 / Halaman">10 / Hal</Select.Item>
						<Select.Item value="25" label="25 / Halaman">25 / Hal</Select.Item>
						<Select.Item value="50" label="50 / Halaman">50 / Hal</Select.Item>
						<Select.Item value="100" label="100 / Halaman">100 / Hal</Select.Item>
					</Select.Content>
				</Select.Root>

				<div class="flex items-center space-x-2">
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex bg-white"
						onclick={() => handlePageChange(1)}
						disabled={res.pagination.currentPage === 1}
					>
						<ChevronsLeft class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8 bg-white"
						onclick={() => handlePageChange(res.pagination.currentPage - 1)}
						disabled={res.pagination.currentPage === 1}
					>
						<ChevronLeftIcon class="h-4 w-4" />
					</Button>
					<div class="flex items-center justify-center text-sm font-medium px-2">
						Halaman {res.pagination.currentPage} dari {res.pagination.totalPages}
					</div>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8 bg-white"
						onclick={() => handlePageChange(res.pagination.currentPage + 1)}
						disabled={res.pagination.currentPage === res.pagination.totalPages}
					>
						<ChevronRightIcon class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex bg-white"
						onclick={() => handlePageChange(res.pagination.totalPages)}
						disabled={res.pagination.currentPage === res.pagination.totalPages}
					>
						<ChevronsRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	{:catch error}
		<Card.Root class="border-red-200 bg-red-50 p-8 text-center">
			<div class="flex flex-col items-center gap-2 text-red-600">
				<XCircle class="h-10 w-10" />
				<h2 class="text-lg font-bold">Gagal Memuat Data</h2>
				<p>{error.message}</p>
				<Button
					onclick={() => window.location.reload()}
					variant="outline"
					class="mt-4 border-red-200 text-red-600 hover:bg-red-100"
				>
					Coba Lagi
				</Button>
			</div>
		</Card.Root>
	{/await}
</div>

<!-- CREATE DIALOG -->
<Dialog.Root bind:open={isCreateModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Tambah Kelompok</Dialog.Title>
			<Dialog.Description>
				Buat kelompok belajar mahasiswa baru untuk kelas praktikum.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" use:enhance={handleActionSubmit} class="space-y-4 pt-2">
			<input type="hidden" name="action" value="create" />
			
			<div class="space-y-2">
				<Label for="create-name">Nama Kelompok</Label>
				<Input id="create-name" name="name" bind:value={groupName} placeholder="Contoh: Kelompok 1" required />
			</div>

			<div class="space-y-2">
				<Label for="create-class">Kelas Praktikum</Label>
				<Select.Root type="single" name="classId" bind:value={selectedClassId}>
					<Select.Trigger class="w-full bg-white">
						{selectedClassName}
					</Select.Trigger>
					<Select.Content>
						{#each data.classes as cls}
							<Select.Item value={cls.id} label={`${cls.name} (${cls.batch})`}>
								{cls.name} ({cls.batch})
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (isCreateModalOpen = false)}>
					Batal
				</Button>
				<Button type="submit" class="bg-[#2D5A43] text-white hover:bg-[#234735]">
					Simpan
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- EDIT DIALOG -->
<Dialog.Root bind:open={isEditModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Edit Kelompok</Dialog.Title>
			<Dialog.Description>
				Perbarui detail kelompok belajar mahasiswa.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" use:enhance={handleActionSubmit} class="space-y-4 pt-2">
			<input type="hidden" name="action" value="update" />
			<input type="hidden" name="id" value={selectedGroup?.id} />

			<div class="space-y-2">
				<Label for="edit-name">Nama Kelompok</Label>
				<Input id="edit-name" name="name" bind:value={groupName} placeholder="Contoh: Kelompok 1" required />
			</div>

			<div class="space-y-2">
				<Label for="edit-class">Kelas Praktikum</Label>
				<Select.Root type="single" name="classId" bind:value={selectedClassId}>
					<Select.Trigger class="w-full bg-white">
						{selectedClassName}
					</Select.Trigger>
					<Select.Content>
						{#each data.classes as cls}
							<Select.Item value={cls.id} label={`${cls.name} (${cls.batch})`}>
								{cls.name} ({cls.batch})
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (isEditModalOpen = false)}>
					Batal
				</Button>
				<Button type="submit" class="bg-[#2D5A43] text-white hover:bg-[#234735]">
					Simpan Perubahan
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- DELETE CONFIRM DIALOG -->
<Dialog.Root bind:open={isDeleteModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title class="text-red-600">Hapus Kelompok</Dialog.Title>
			<Dialog.Description>
				Apakah Anda yakin ingin menghapus kelompok ini? Tindakan ini tidak dapat dibatalkan.
			</Dialog.Description>
		</Dialog.Header>
		{#if selectedGroup}
			<div class="py-2 text-sm text-slate-600">
				<p>Kelompok: <strong>{selectedGroup.name}</strong></p>
				<p class="mt-2 text-red-500 font-semibold">
					Peringatan: Sebanyak {selectedGroup.members?.length || 0} anggota mahasiswa di kelompok ini akan dilepas keanggotaannya.
				</p>
			</div>
		{/if}
		<form method="POST" use:enhance={handleActionSubmit} class="pt-2">
			<input type="hidden" name="action" value="delete" />
			<input type="hidden" name="id" value={selectedGroup?.id} />
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (isDeleteModalOpen = false)}>
					Batal
				</Button>
				<Button type="submit" class="bg-red-600 text-white hover:bg-red-700">
					Hapus Kelompok
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
