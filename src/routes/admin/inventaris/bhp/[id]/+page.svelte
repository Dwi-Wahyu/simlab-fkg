<script lang="ts">
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronUp,
		Search,
		Trash2
	} from '@lucide/svelte';
	import { untrack } from 'svelte';
	import Skeleton from '@/components/ui/skeleton/skeleton.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { toast } from '$lib/components/toast';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { cn } from '$lib/utils';

	let { data } = $props();

	let searchQuery = $state(pageStore.url.searchParams.get('search') || '');
	let debounceTimer: any;
	let expandedItems = $state<Record<string, boolean>>({});

	let showDeleteModal = $state(false);
	let selectedBatchId = $state<string | null>(null);
	let deleteLoading = $state(false);
	let deleteForm = $state<HTMLFormElement>();

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
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateUrl({ search: searchQuery, page: 1 });
		}, 300);
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

	function expiryStatus(expiryDate: string | null) {
		if (!expiryDate) return { label: 'Tidak Kedaluwarsa', variant: 'secondary' as const };
		const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
		if (days < 0) return { label: 'Kedaluwarsa', variant: 'destructive' as const };
		if (days <= 3) return { label: `${days} hari lagi`, variant: 'destructive' as const };
		if (days <= 14) return { label: `${days} hari lagi`, variant: 'default' as const };
		return { label: `${days} hari lagi`, variant: 'secondary' as const };
	}
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<Button href="/admin/inventaris/bhp" variant="outline" class="-mb-2 w-fit md:hidden" size="sm">
		<ChevronLeft class="size-5" /> Kembali
	</Button>

	{#await data.bhpBatchPromise}
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
		<div class="flex items-center gap-4">
			<Button href="/admin/inventaris/bhp" variant="outline" class="hidden md:flex" size="icon">
				<ChevronLeft class="size-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold text-slate-900">{res.item.name ?? '...'}</h1>
				<p class="text-sm text-slate-500">{res.item.id}</p>
			</div>
		</div>

		<!-- Table Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					placeholder="Cari merk/varian..."
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
							<Table.Head class="px-6 py-4">Merk/Varian</Table.Head>
							<Table.Head>Sisa Jumlah</Table.Head>
							<Table.Head>Tanggal Masuk</Table.Head>
							<Table.Head>Tanggal Kedaluwarsa</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Lab</Table.Head>
							<Table.Head class="pr-6 text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#if res.batches.length === 0}
							<Table.Row class="flex flex-col md:table-row">
								<Table.Cell
									colspan={6}
									class="py-10 text-center text-muted-foreground md:table-cell"
								>
									Data batch tidak ditemukan.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each res.batches as batch (batch.id)}
								<Table.Row
									class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
								>
									<!-- Merk/Varian + Mobile status/expand -->
									<Table.Cell
										class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
									>
										<div class="flex flex-col">
											<span class="font-bold text-slate-900 md:font-medium">
												{#if batch.brand || batch.variant}
													{batch.brand || '-'} {batch.variant ? `(${batch.variant})` : ''}
												{:else}
													-
												{/if}
											</span>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="ml-4 h-8 w-8 shrink-0 md:hidden"
											onclick={() => (expandedItems[batch.id] = !expandedItems[batch.id])}
											aria-label="Expand row"
										>
											{#if expandedItems[batch.id]}
												<ChevronUp class="h-4 w-4" />
											{:else}
												<ChevronDown class="h-4 w-4" />
											{/if}
										</Button>
									</Table.Cell>

									<!-- Sisa Jumlah -->
									<Table.Cell
										class={cn(
											expandedItems[batch.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Sisa Jumlah</span>
										<span class="text-sm text-slate-600">
											{batch.qty} / {batch.initialQty}
											{res.item.baseUnit}
										</span>
									</Table.Cell>

									<!-- Tanggal Masuk -->
									<Table.Cell
										class={cn(
											expandedItems[batch.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Tanggal Masuk</span
										>
										<span class="text-sm text-slate-600">
											{batch.receivedAt
												? new Date(batch.receivedAt).toLocaleDateString('id-ID', {
														day: 'numeric',
														month: 'long',
														year: 'numeric'
													})
												: '-'}
										</span>
									</Table.Cell>

									<!-- Tanggal Kedaluwarsa -->
									<Table.Cell
										class={cn(
											expandedItems[batch.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden"
											>Tanggal Kedaluwarsa</span
										>
										<span class="text-sm text-slate-600">
											{batch.expiryDate
												? new Date(batch.expiryDate).toLocaleDateString('id-ID', {
														day: 'numeric',
														month: 'long',
														year: 'numeric'
													})
												: '-'}
										</span>
									</Table.Cell>

									<!-- Status -->
									<Table.Cell
										class={cn(
											expandedItems[batch.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Status</span>
										<div>
											<Badge variant={expiryStatus(batch.expiryDate).variant}>
												{expiryStatus(batch.expiryDate).label}
											</Badge>
										</div>
									</Table.Cell>

									<!-- Lab/Gudang -->
									<Table.Cell
										class={cn(
											expandedItems[batch.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Lab/Gudang</span>
										<span class="text-sm text-slate-600">
											{batch.laboratoriumName || batch.warehouseName || '-'}
										</span>
									</Table.Cell>

									<!-- Aksi -->
									<Table.Cell
										class={cn(
											expandedItems[batch.id] ? 'flex' : 'hidden',
											'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:py-4 md:text-right'
										)}
									>
										{#if data.user?.role === 'superadmin' || (['kepalaLab', 'laboran'].includes(data.user?.role ?? '') && data.user?.laboratorium?.id === batch.laboratoriumId)}
											<Button
												variant="destructive"
												size="sm"
												class="h-8 gap-1"
												onclick={() => {
													selectedBatchId = batch.id;
													showDeleteModal = true;
												}}
											>
												<Trash2 class="size-4" />
												<span class="hidden md:inline">Hapus</span>
											</Button>
										{/if}
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
					)} dari {res.pagination.totalItems} batch
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
		<div class="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive">
			{error.message}
		</div>
	{/await}
</div>

<form
	method="POST"
	action="?/deleteBatch"
	use:enhance={() => {
		deleteLoading = true;
		return async ({ result }) => {
			deleteLoading = false;
			showDeleteModal = false;
			selectedBatchId = null;
			if (result.type === 'success') {
				toast.success('Berhasil', { description: 'Batch berhasil dihapus' });
				await invalidateAll();
			} else {
				toast.error('Gagal', { description: result.data?.message || 'Terjadi kesalahan' });
			}
		};
	}}
	bind:this={deleteForm}
>
	<input type="hidden" name="batchId" value={selectedBatchId || ''} />
</form>

<ConfirmationDialog
	bind:open={showDeleteModal}
	type="error"
	title="Hapus Batch Stok?"
	description="Tindakan ini tidak dapat dibatalkan. Batch stok ini akan dihapus secara permanen dan total stok akan disesuaikan."
	actionLabel="Hapus Batch"
	cancelLabel="Batal"
	loading={deleteLoading}
	onAction={() => {
		deleteForm?.requestSubmit();
	}}
/>
