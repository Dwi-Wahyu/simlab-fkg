<script lang="ts">
	import {
		Activity,
		AlertCircle,
		AlertTriangle,
		CheckCircle,
		Database,
		Package,
		Plus,
		Search,
		ShieldCheck,
		Trash2,
		XCircle,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronDown,
		ChevronUp
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils';
	import Skeleton from '@/components/ui/skeleton/skeleton.svelte';

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
	let debounceTimer: any;
	let expandedItems = $state<Record<string, boolean>>({});

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
		<div class="flex items-center gap-4">
			<Button href="/admin/inventaris/alat" variant="outline" class="hidden md:flex" size="icon">
				<ChevronLeft class="size-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold text-slate-900">{res.equipment.name ?? '...'}</h1>
				<p class="text-sm text-slate-500">{res.equipment.id}</p>
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
				<Button href="/admin/inventaris/tambah">
					<Plus /> Tambah Alat
				</Button>
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
							<Table.Head>Gudang</Table.Head>
							<Table.Head>Kondisi</Table.Head>
							<Table.Head>Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#if res.equipments.length === 0}
							<Table.Row class="flex flex-col md:table-row">
								<Table.Cell
									colspan={7}
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
												<Badge
													variant="outline"
													class={cn(
														'px-1.5 py-0.5 text-[9px] md:hidden',
														equipment.status === 'READY'
															? 'border-green-200 text-green-600'
															: equipment.status === 'IN_USE'
																? 'border-blue-200 text-blue-600'
																: 'border-red-200 text-red-600'
													)}
												>
													{equipment.status}
												</Badge>
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
										{equipment.brand}
									</Table.Cell>

									<!-- Gudang -->
									<Table.Cell
										class={cn(
											expandedItems[equipment.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Gudang</span>
										<span class="text-sm text-slate-600">{equipment.warehouseName}</span>
									</Table.Cell>

									<!-- Kondisi -->
									<Table.Cell
										class={cn(
											expandedItems[equipment.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:pl-2'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Kondisi</span>
										<Badge
											variant={equipment.condition === 'BAIK'
												? 'default'
												: equipment.condition === 'RUSAK_RINGAN'
													? 'outline'
													: 'destructive'}
											class={cn(
												'w-fit',
												equipment.condition === 'BAIK'
													? 'bg-green-100 text-green-700 hover:bg-green-100'
													: equipment.condition === 'RUSAK_RINGAN'
														? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
														: ''
											)}
										>
											{equipment.condition}
										</Badge>
									</Table.Cell>

									<!-- Status (Desktop only) -->
									<Table.Cell class="hidden md:table-cell md:border-b md:py-4 md:pl-2">
										<Badge
											variant="outline"
											class={equipment.status === 'READY'
												? 'border-green-200 text-green-600'
												: equipment.status === 'IN_USE'
													? 'border-blue-200 text-blue-600'
													: 'border-red-200 text-red-600'}
										>
											{equipment.status}
										</Badge>
									</Table.Cell>

									<!-- Aksi -->
									<!-- <Table.Cell
										class={cn(
											expandedItems[equipment.id] ? 'flex' : 'hidden',
											'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4 md:text-right'
										)}
									></Table.Cell> -->
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
