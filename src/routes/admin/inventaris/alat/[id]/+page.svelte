<script lang="ts">
	import {
		Activity,
		AlertCircle,
		AlertTriangle,
		CheckCircle,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronUp,
		Database,
		Edit,
		Package,
		Plus,
		Search,
		ShieldCheck,
		Trash2,
		XCircle
	} from '@lucide/svelte';
	import { untrack } from 'svelte';
	import Skeleton from '@/components/ui/skeleton/skeleton.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { cn } from '$lib/utils';
	import { toast } from '$lib/components/toast';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { shouldShowNewBadge } from '$lib/utils/item-badge';

	let { data } = $props();

	// Map icon strings to components
	const iconMap = {
		Package,
		CheckCircle,
		AlertTriangle,
		XCircle,
		Database,
		ShieldCheck,
		AlertCircle,
		Trash2
	};

	let searchQuery = $state(pageStore.url.searchParams.get('search') || '');
	let expandedItems = $state<Record<string, boolean>>({});

	let isDeleteItemConfirmOpen = $state(false);
	let isDeletingItem = $state(false);

	function handleDeleteItem() {
		isDeletingItem = true;
		fetch('?/deleteItem', {
			method: 'POST',
			body: new FormData()
		}).then(async (res) => {
			isDeletingItem = false;
			isDeleteItemConfirmOpen = false;
			if (res.ok) {
				toast.success('Berhasil', { description: 'Alat berhasil dihapus.' });
				goto('/admin/inventaris/alat');
			} else {
				toast.destructive('Gagal', {
					description: 'Gagal menghapus Alat. Item ini mungkin masih memiliki unit aktif.'
				});
			}
		});
	}

	function updateUrl(params: Record<string, string | number | undefined>) {
		const url = new URL(pageStore.url);
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
		updateUrl({ search: searchQuery, page: 1 });
	}

	function handlePageChange(newPage: number) {
		updateUrl({ page: newPage });
	}

	function handleLimitChange(newLimit: string) {
		updateUrl({ limit: newLimit, page: 1 });
	}

	// Sync searchQuery with URL if it changes externally
	$effect(() => {
		const urlSearch = pageStore.url.searchParams.get('search') || '';
		untrack(() => {
			if (searchQuery !== urlSearch) {
				searchQuery = urlSearch;
			}
		});
	});
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<Button href="/admin/inventaris/alat" variant="outline" class="-mb-2 w-fit md:hidden" size="sm">
		<ChevronLeft class="size-5" /> Kembali
	</Button>

	{#await data.alatPromise}
		<div>
			<div class="mb-4 hidden items-center justify-between gap-4 md:flex">
				<Skeleton class="h-10 w-20" />

				<div class="flex gap-2">
					<Skeleton class="h-10 w-16" />
					<Skeleton class="h-10 w-12" />
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<Skeleton class="h-10 w-full" />

				<Skeleton class="h-52 w-full" />
				<Skeleton class="h-10 w-full" />
			</div>
		</div>
	{:then res}
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-4">
				<Button href="/admin/inventaris/alat" variant="outline" class="hidden md:flex" size="icon">
					<ChevronLeft class="size-5" />
				</Button>
				<div>
					<div class="flex items-center gap-2">
						<h1 class="text-2xl font-bold text-slate-900">{res.equipment.name ?? '...'}</h1>
						{#if shouldShowNewBadge(res.equipment?.createdAt, res.equipment?.hideNewBadge)}
							<Badge class="bg-blue-500 px-1.5 py-0 text-[10px] font-semibold text-white hover:bg-blue-600">Baru</Badge>
						{/if}
					</div>
					<p class="text-sm text-slate-500">{res.equipment.id}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				{#if ['kepalaLab', 'laboran', 'superadmin'].includes(data.user?.role)}
					<Button href="/admin/inventaris/alat/tambah?itemId={res.equipment.id}" class="gap-2">
						<Plus class="size-4" /> Tambah Alat
					</Button>
					<Button
						variant="destructive"
						class="gap-2"
						onclick={() => (isDeleteItemConfirmOpen = true)}
					>
						<Trash2 class="size-4" /> Hapus Item
					</Button>
				{/if}
			</div>
		</div>

		<!-- Table Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					placeholder="Cari serial number ..."
					class="pl-10"
					bind:value={searchQuery}
					oninput={handleSearch}
				/>
			</div>
			<div class="flex items-center gap-2">
				<Select.Root
					type="single"
					value={res.pagination.limit.toString()}
					onValueChange={handleLimitChange}
				>
					<Select.Trigger class="w-27.5">
						{res.pagination.limit} / Hal
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10" label="10 / Halaman">10 / Hal</Select.Item>
						<Select.Item value="25" label="25 / Halaman">25 / Hal</Select.Item>
						<Select.Item value="50" label="50 / Halaman">50 / Hal</Select.Item>
						<Select.Item value="100" label="100 / Halaman">100 / Hal</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Data Table -->
		<div class="rounded-md border bg-white shadow-sm">
			<div class="overflow-x-auto">
				<Table.Root class="block md:table">
					<Table.Header class="hidden md:table-header-group">
						<Table.Row class="md:table-row">
							<Table.Head class="px-6 py-4">Serial Number</Table.Head>
							<Table.Head>Merk</Table.Head>
							<Table.Head>Lokasi</Table.Head>
							<Table.Head>Tanggal Ditambahkan</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#if res.equipments.length === 0}
							<Table.Row class="flex flex-col md:table-row">
								<Table.Cell
									colspan={5}
									class="py-10 text-center text-muted-foreground md:table-cell"
								>
									Data tidak ditemukan.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each res.equipments as equipment (equipment.id)}
								<Table.Row
									class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
								>
									<!-- Nama Alat + Mobile status/expand -->
									<Table.Cell
										class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
									>
										<div class="flex flex-col">
											<div class="flex items-center gap-2">
												<span class="font-bold text-slate-900 md:font-medium"
													>{equipment.serialNumber}</span
												>
												{#if shouldShowNewBadge(equipment.createdAt, res.equipment?.hideNewBadge)}
													<Badge
														class="bg-blue-500 px-1.5 py-0 text-[10px] font-semibold text-white hover:bg-blue-600"
														>Baru</Badge
													>
												{/if}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="ml-4 h-8 w-8 shrink-0 md:hidden"
											onclick={() => (expandedItems[equipment.id] = !expandedItems[equipment.id])}
											aria-label="Expand row"
										>
											{#if expandedItems[equipment.id]}
												<ChevronUp class="h-4 w-4" />
											{:else}
												<ChevronDown class="h-4 w-4" />
											{/if}
										</Button>
									</Table.Cell>

									<!-- Merk (Hidden on mobile as it's in the first cell) -->
									<Table.Cell class="hidden md:table-cell md:border-b md:py-4 md:pl-2">
										<div class="flex items-center gap-2">
											<span>{equipment.brand || '-'}</span>
										</div>
									</Table.Cell>

									<!-- Lokasi -->
									<Table.Cell
										class={cn(
											expandedItems[equipment.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Lokasi</span>
										<span class="text-sm text-slate-600">{equipment.storageLocation || '-'}</span>
									</Table.Cell>

									<!-- Tanggal Ditambahkan -->
									<Table.Cell
										class={cn(
											expandedItems[equipment.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden"
											>Tanggal Ditambahkan</span
										>
										<span class="text-sm text-slate-600">
											{equipment.createdAt
												? new Date(equipment.createdAt).toLocaleDateString('id-ID', {
														day: 'numeric',
														month: 'long',
														year: 'numeric'
													})
												: '-'}
										</span>
									</Table.Cell>

									<!-- Aksi -->
									<Table.Cell
										class={cn(
											expandedItems[equipment.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2 md:text-right'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Aksi</span>
										<div class="flex items-center gap-2 md:justify-end">
											{#if (data.user?.role === 'kepalaLab' || data.user?.role === 'laboran') && data.user?.laboratorium?.id === equipment.laboratoriumId}
												<Button
													variant="outline"
													size="icon"
													class="h-8 w-8"
													href="/admin/inventaris/alat/{res.equipment
														.id}/edit?equipmentId={equipment.id}"
												>
													<Edit class="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="icon"
													class="h-8 w-8 text-destructive"
													onclick={() => openDeleteDialog(equipment.id)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											{/if}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Pagination -->
			<div class="flex items-center justify-between border-t px-4 py-4">
				<div class="text-sm text-muted-foreground">
					Menampilkan {(res.pagination.currentPage - 1) * res.pagination.limit + 1} sampai {Math.min(
						res.pagination.currentPage * res.pagination.limit,
						res.pagination.totalItems
					)} dari {res.pagination.totalItems} alat
				</div>
				<div class="flex items-center space-x-2">
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex"
						onclick={() => handlePageChange(1)}
						disabled={res.pagination.currentPage === 1}
					>
						<ChevronsLeft class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						onclick={() => handlePageChange(res.pagination.currentPage - 1)}
						disabled={res.pagination.currentPage === 1}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<div class="flex items-center justify-center text-sm font-medium">
						Halaman {res.pagination.currentPage} dari {res.pagination.totalPages}
					</div>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						onclick={() => handlePageChange(res.pagination.currentPage + 1)}
						disabled={res.pagination.currentPage === res.pagination.totalPages}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex"
						onclick={() => handlePageChange(res.pagination.totalPages)}
						disabled={res.pagination.currentPage === res.pagination.totalPages}
					>
						<ChevronsRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	{:catch error}
		ada error

		{error.message}
	{/await}
</div>

<ConfirmationDialog
	bind:open={isDeleteItemConfirmOpen}
	type="error"
	title="Hapus Item Inventaris?"
	description="Tindakan ini tidak dapat dibatalkan. Menghapus item ini akan menghapusnya dari data inventaris secara permanen."
	actionLabel="Hapus Item"
	cancelLabel="Batal"
	loading={isDeletingItem}
	onAction={handleDeleteItem}
/>
