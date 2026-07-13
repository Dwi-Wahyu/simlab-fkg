<script lang="ts">
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronUp,
		FileEdit,
		Plus,
		Search,
		Trash2,
		Download,
		FileText
	} from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { cn } from '$lib/utils';
	import { toast } from '$lib/components/toast';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';

	let { data } = $props();

	let searchQuery = $state(pageStore.url.searchParams.get('search') || '');
	let expandedItems = $state<Record<string, boolean>>({});
	let isDeleteConfirmOpen = $state(false);
	let auditIdToDelete = $state('');
	let deleteLoading = $state(false);

	function openDeleteDialog(id: string) {
		auditIdToDelete = id;
		isDeleteConfirmOpen = true;
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

	function executeSearch() {
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
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-col gap-2">
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Quality & Audit</h1>
			<p class="text-slate-500">
				Daftar rekaman checklist dan sertifikasi penjaminan mutu laboratorium.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button href="/admin/audit/tambah">
				<Plus class="mr-2 size-4" /> Tambah Audit
			</Button>
		</div>
	</div>

	{#await data.auditPromise}
		<!-- Skeleton Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="h-10 w-full max-w-sm animate-pulse rounded-md bg-slate-200"></div>
			<div class="h-10 w-32 animate-pulse rounded-md bg-slate-200"></div>
		</div>

		<!-- Skeleton Table -->
		<div class="rounded-md border bg-white shadow-sm">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Nama Audit</Table.Head>
							<Table.Head>Institusi</Table.Head>
							<Table.Head>Tanggal</Table.Head>
							<Table.Head>Deskripsi</Table.Head>
							<Table.Head>Sertifikat</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each Array(5) as _}
							<Table.Row>
								{#each Array(6) as _}
									<Table.Cell>
										<div class="h-4 w-full animate-pulse rounded bg-slate-100"></div>
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	{:then res}
		<!-- Table Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex w-full max-w-sm gap-2">
				<div class="relative flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<Input
						placeholder="Cari nama audit/institusi..."
						class="pl-10"
						bind:value={searchQuery}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								executeSearch();
							}
						}}
					/>
				</div>
				<Button onclick={executeSearch} variant="secondary" class="gap-1">
					<Search class="size-4" /> Cari
				</Button>
			</div>
			<div class="flex flex-wrap items-center gap-2">
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
							<Table.Head class="px-6 py-4">Nama Audit</Table.Head>
							<Table.Head>Institusi</Table.Head>
							<Table.Head>Tanggal</Table.Head>
							<Table.Head>Deskripsi</Table.Head>
							<Table.Head>Sertifikat</Table.Head>
							<Table.Head class="pr-6 text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#if res.items.length === 0}
							<Table.Row class="flex flex-col md:table-row">
								<Table.Cell
									colspan={6}
									class="py-10 text-center text-muted-foreground md:table-cell"
								>
									Data tidak ditemukan.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each res.items as item (item.id)}
								<Table.Row
									class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
								>
									<!-- Nama Audit + Mobile expand -->
									<Table.Cell
										class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
									>
										<div class="flex flex-col">
											<span class="font-bold text-slate-900 md:font-medium">{item.nama}</span>
											<span class="mt-0.5 text-xs text-muted-foreground md:hidden"
												>{item.institusi}</span
											>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="ml-4 h-8 w-8 shrink-0 md:hidden"
											onclick={() => (expandedItems[item.id] = !expandedItems[item.id])}
											aria-label="Expand row"
										>
											{#if expandedItems[item.id]}
												<ChevronUp class="h-4 w-4" />
											{:else}
												<ChevronDown class="h-4 w-4" />
											{/if}
										</Button>
									</Table.Cell>

									<!-- Institusi -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Institusi</span>
										<span class="text-sm text-slate-600">{item.institusi}</span>
									</Table.Cell>

									<!-- Tanggal -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Tanggal</span>
										<span class="text-sm text-slate-600">
											{item.tanggal
												? new Date(item.tanggal).toLocaleDateString('id-ID', {
														day: 'numeric',
														month: 'long',
														year: 'numeric'
													})
												: '-'}
										</span>
									</Table.Cell>

									<!-- Deskripsi -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'max-w-xs flex-col gap-1 truncate border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Deskripsi</span>
										<span class="text-sm text-slate-600">{item.deskripsi || '-'}</span>
									</Table.Cell>

									<!-- Sertifikat -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Sertifikat</span>
										<div>
											{#if item.sertifikat}
												<Button
													href="/uploads/certificates/{item.sertifikat}"
													target="_blank"
													variant="outline"
													size="sm"
													class="h-8 gap-1.5"
												>
													<Download class="size-3.5" /> Unduh
												</Button>
											{:else}
												<span class="text-xs text-slate-400 italic">Tidak ada sertifikat</span>
											{/if}
										</div>
									</Table.Cell>

									<!-- Aksi -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4 md:text-right'
										)}
									>
										<div class="flex items-center gap-2 md:justify-end">
											<Button
												size="sm"
												variant="outline"
												href="/admin/audit/{item.id}/edit"
												class="gap-1"
											>
												<FileEdit class="size-4" /> Edit
											</Button>
											<Button
												size="sm"
												variant="destructive"
												onclick={() => openDeleteDialog(item.id)}
												class="gap-1"
											>
												<Trash2 class="size-4" /> Hapus
											</Button>
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
				<div class="text-sm text-slate-500">
					Menampilkan {(res.pagination.currentPage - 1) * res.pagination.limit + 1} sampai {Math.min(
						res.pagination.currentPage * res.pagination.limit,
						res.pagination.totalItems
					)} dari {res.pagination.totalItems} audit
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
	{/await}
</div>

<ConfirmationDialog
	bind:open={isDeleteConfirmOpen}
	type="error"
	title="Hapus Rekaman Audit?"
	description="Tindakan ini tidak dapat dibatalkan. Rekaman audit ini beserta sertifikat yang terunggah akan dihapus secara permanen."
	actionLabel="Hapus"
	cancelLabel="Batal"
	loading={deleteLoading}
	onAction={() => {
		deleteLoading = true;
		const formData = new FormData();
		formData.append('id', auditIdToDelete);

		fetch('?/delete', {
			method: 'POST',
			body: formData
		}).then(async (res) => {
			deleteLoading = false;
			isDeleteConfirmOpen = false;
			if (res.ok) {
				toast.success('Berhasil', { description: 'Audit berhasil dihapus.' });
				await invalidateAll();
			} else {
				toast.destructive('Gagal', { description: 'Gagal menghapus audit.' });
			}
		});
	}}
/>
