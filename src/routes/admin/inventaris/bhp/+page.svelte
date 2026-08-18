<script lang="ts">
	import {
		AlertCircle,
		ArrowDownWideNarrow,
		ArrowUpDown,
		ArrowUpNarrowWide,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronUp,
		Database,
		Download,
		Eye,
		FileEdit,
		Filter,
		MoreHorizontal,
		Plus,
		RotateCcw,
		Search,
		ShieldCheck,
		Trash2,
		XCircle
	} from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import ExportPeriodicReportDialog from '$lib/components/ExportPeriodicReportDialog.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { toast } from '$lib/components/toast';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { cn } from '$lib/utils';
	import { shouldShowNewBadge } from '$lib/utils/item-badge';

	let { data } = $props();

	let laboratories = $state<any[]>([]);

	let selectedLabId = $state(pageStore.url.searchParams.get('laboratoriumId') || 'all');
	const selectedLabName = $derived(
		laboratories.find((l) => l.id === selectedLabId)?.name ?? 'Semua Laboratorium'
	);

	function handleLabChange(newLabId: string | undefined) {
		if (newLabId === undefined) return;
		selectedLabId = newLabId;
		updateUrl({ laboratoriumId: newLabId === 'all' ? '' : newLabId, page: 1 });
	}

	let categories = $state<any[]>([]);
	let selectedCategoryId = $state(pageStore.url.searchParams.get('categoryId') || 'all');
	const selectedCategoryName = $derived(
		categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Semua Kategori'
	);

	let showExportDialog = $state(false);
	let showFilterDialog = $state(false);

	const isLabFiltered = $derived(
		!['kepalaLab', 'laboran'].includes(data.user?.role) &&
			selectedLabId !== 'all' &&
			selectedLabId !== ''
	);
	const isCategoryFiltered = $derived(selectedCategoryId !== 'all' && selectedCategoryId !== '');
	const activeFilterCount = $derived((isLabFiltered ? 1 : 0) + (isCategoryFiltered ? 1 : 0));
	const hasActiveFilters = $derived(activeFilterCount > 0);

	function clearFilters() {
		selectedCategoryId = 'all';
		handleCategoryChange('all');
		if (!['kepalaLab', 'laboran'].includes(data.user?.role)) {
			selectedLabId = 'all';
			handleLabChange('all');
		}
	}

	let viewMode = $state<'table' | 'grouped'>(
		(pageStore.url.searchParams.get('view') as 'grouped' | 'table') || 'table'
	);

	function handleViewChange(mode: 'table' | 'grouped') {
		viewMode = mode;
		updateUrl({ view: mode === 'table' ? '' : 'grouped', page: 1 });
	}

	function getBhpGroups(items: any[], categoriesList: any[]) {
		const map = new Map<string, any[]>();
		for (const it of items) {
			const key = it.categoryId ?? '__none__';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(it);
		}
		const named = categoriesList
			.filter((c) => map.has(c.id))
			.map((c) => ({
				key: c.id,
				name: c.name,
				items: map.get(c.id)!.sort((a, b) => a.name.localeCompare(b.name))
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		const withoutCategory = map.get('__none__');
		if (withoutCategory && withoutCategory.length > 0) {
			named.push({
				key: '__none__',
				name: 'Tanpa Kategori',
				items: withoutCategory.sort((a, b) => a.name.localeCompare(b.name))
			});
		}
		return named;
	}

	onMount(async () => {
		const promises: Promise<Response>[] = [fetch('/api/admin/equipment-category')];
		if (!['kepalaLab', 'laboran'].includes(data.user?.role)) {
			promises.push(fetch('/api/admin/laboratorium'));
		}
		const [catRes, labRes] = await Promise.all(promises);
		if (catRes.ok) {
			categories = await catRes.json();
		}
		if (labRes && labRes.ok) {
			laboratories = await labRes.json();
		}
	});

	// Map icon strings to components
	const iconMap = {
		Database,
		ShieldCheck,
		AlertCircle,
		Trash2
	};

	let searchQuery = $state(pageStore.url.searchParams.get('search') || '');
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
		goto(url.toString(), { keepFocus: true });
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

	let currentSort = $state(pageStore.url.searchParams.get('sort') || '');

	function toggleSort() {
		let nextSort = '';
		if (currentSort === '') {
			nextSort = 'asc';
		} else if (currentSort === 'asc') {
			nextSort = 'desc';
		} else {
			nextSort = '';
		}
		currentSort = nextSort;
		updateUrl({ sort: nextSort, page: 1 });
	}

	// Sync searchQuery with URL if it changes externally
	$effect(() => {
		const urlSearch = pageStore.url.searchParams.get('search') || '';
		const urlCat = pageStore.url.searchParams.get('categoryId') || 'all';
		const urlLab = pageStore.url.searchParams.get('laboratoriumId') || 'all';
		const urlSort = pageStore.url.searchParams.get('sort') || '';
		const urlView = (pageStore.url.searchParams.get('view') as 'grouped' | 'table') || 'table';
		untrack(() => {
			if (searchQuery !== urlSearch) {
				searchQuery = urlSearch;
			}
			if (selectedCategoryId !== urlCat) {
				selectedCategoryId = urlCat;
			}
			if (selectedLabId !== urlLab) {
				selectedLabId = urlLab;
			}
			if (currentSort !== urlSort) {
				currentSort = urlSort;
			}
			if (viewMode !== urlView) {
				viewMode = urlView;
			}
		});
	});

	function handleCategoryChange(newCategoryId: string | undefined) {
		if (newCategoryId === undefined) return;
		selectedCategoryId = newCategoryId;
		updateUrl({
			categoryId: newCategoryId === 'all' ? '' : newCategoryId,
			page: 1
		});
	}

	// ─── Ubah Stok Modal ───
	let showStockModal = $state(false);
	let stockLoading = $state(false);
	let stockItem = $state<{
		id: string;
		name: string;
		totalQty: number;
		minStock: number;
		baseUnit: string;
		stocks?: {
			id: string;
			brand: string;
			variant: string;
			qty: number;
			laboratoriumId: string;
		}[];
	} | null>(null);
	let stockEventType = $state<'RECEIVE' | 'ISSUE' | 'ADJUSTMENT'>('RECEIVE');
	const eventTypeOptions = [
		{ value: 'RECEIVE', label: 'Stok Masuk (Penambahan)' },
		{ value: 'ISSUE', label: 'Stok Keluar (Pengurangan)' },
		{ value: 'ADJUSTMENT', label: 'Penyesuaian (Opnam)' }
	];
	const stockEventTrigger = $derived(
		eventTypeOptions.find((opt) => opt.value === stockEventType)?.label ?? 'Pilih Tipe Perubahan...'
	);
	let stockQty = $state<number>(0);
	let stockNotes = $state('');
	let stockExpiryDate = $state<string>('');
	let stockLaboratoriumId = $state('');
	let laboratoriumList = $state<{ id: string; name: string }[]>([]);

	let selectedStockRowId = $state('');
	let isNewVariant = $state(false);
	let stockBrand = $state('');
	let stockVariant = $state('');

	const isRestrictedLabUser = $derived(
		data.user?.role === 'kepalaLab' || data.user?.role === 'laboran'
	);
	const userLabId = $derived(data.user?.laboratorium?.id ?? '');

	$effect(() => {
		if (isRestrictedLabUser && userLabId) {
			stockLaboratoriumId = userLabId;
		}
	});

	const activeLabId = $derived(isRestrictedLabUser ? userLabId : stockLaboratoriumId);
	const currentLabStocks = $derived(
		stockItem?.stocks?.filter((s) => s.laboratoriumId === activeLabId) ?? []
	);
	const selectedStockRow = $derived(currentLabStocks.find((s) => s.id === selectedStockRowId));

	function openStockModal(item: any) {
		stockItem = item;
		stockEventType = 'RECEIVE';
		stockQty = 0;
		stockNotes = '';
		stockExpiryDate = '';
		isNewVariant = false;
		stockBrand = '';
		stockVariant = '';

		if (!isRestrictedLabUser) {
			if (laboratories.length > 0) {
				stockLaboratoriumId = laboratories[0].id;
			}
		}

		const matchingStocks = item.stocks?.filter((s: any) => s.laboratoriumId === activeLabId) ?? [];
		if (matchingStocks.length > 0) {
			selectedStockRowId = matchingStocks[0].id;
			stockBrand = matchingStocks[0].brand || '';
			stockVariant = matchingStocks[0].variant || '';
		} else {
			selectedStockRowId = 'NEW';
			isNewVariant = true;
		}

		showStockModal = true;
	}

	function handleStockRowSelection(rowId: string) {
		selectedStockRowId = rowId;
		if (rowId === 'NEW') {
			isNewVariant = true;
			stockBrand = '';
			stockVariant = '';
		} else {
			isNewVariant = false;
			const found = currentLabStocks.find((s) => s.id === rowId);
			if (found) {
				stockBrand = found.brand || '';
				stockVariant = found.variant || '';
			}
		}
	}

	async function submitStockChange() {
		if (!stockItem) return;
		const labId = isRestrictedLabUser ? userLabId : stockLaboratoriumId;
		if (!labId) {
			toast.destructive('Laboratorium Wajib', {
				description: 'Pilih laboratorium tujuan terlebih dahulu.'
			});
			return;
		}

		if (stockQty <= 0) {
			toast.destructive('Jumlah Tidak Valid', {
				description: 'Jumlah perubahan stok harus lebih besar dari 0.'
			});
			return;
		}

		let brand = stockBrand;
		let variant = stockVariant;
		if (!isNewVariant && selectedStockRowId !== 'NEW') {
			const found = currentLabStocks.find((s) => s.id === selectedStockRowId);
			if (found) {
				brand = found.brand || '';
				variant = found.variant || '';
			}
		}

		if (stockEventType === 'ADJUSTMENT' && stockQty < stockItem.minStock) {
			toast.destructive('Di Bawah Minimum', {
				description: `Stok akhir (${stockQty}) tidak boleh kurang dari minimum (${stockItem.minStock}).`
			});
			return;
		}

		stockLoading = true;
		try {
			const res = await fetch('/api/admin/inventaris/bhp/stock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId: stockItem.id,
					eventType: stockEventType,
					qty: stockQty,
					notes: stockNotes || undefined,
					laboratoriumId: labId,
					expiryDate: stockEventType === 'RECEIVE' ? stockExpiryDate || undefined : undefined,
					brand: brand || undefined,
					variant: variant || undefined
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Unknown error' }));
				throw new Error(err.message || `Server error: ${res.status}`);
			}
			const result = await res.json();
			toast.success('Stok Berhasil Diperbarui', {
				description: `${result.itemName} — stok saat ini: ${result.newQty} ${stockItem.baseUnit}.`
			});
			showStockModal = false;
			await invalidateAll();
		} catch (e: any) {
			toast.destructive('Gagal', { description: e.message });
		} finally {
			stockLoading = false;
		}
	}
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Bahan Habis Pakai</h1>
			<p class="text-slate-500">Manajemen stok bahan dan konsumsi laboratorium.</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button onclick={() => (showExportDialog = true)} variant="outline" class="gap-2">
				<Download class="size-4" /> Export
			</Button>

			{#if ['kepalaLab', 'laboran'].includes(data.user?.role)}
				<Button href="/admin/inventaris/bhp/tambah">
					<Plus /> Tambah Item
				</Button>
			{/if}
		</div>
	</div>

	{#await data.bhpPromise}
		<!-- Skeleton Summary Cards -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<div class="h-4 w-24 animate-pulse rounded bg-slate-200"></div>
						<div class="h-4 w-4 animate-pulse rounded bg-slate-200"></div>
					</Card.Header>
					<Card.Content>
						<div class="h-8 w-16 animate-pulse rounded bg-slate-200"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Skeleton Table Controls -->
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
							<Table.Head>Nama Bahan</Table.Head>
							<Table.Head>Stok Sekarang</Table.Head>
							<Table.Head>Stok Minimum</Table.Head>
							<Table.Head>Satuan</Table.Head>
							<Table.Head>Status</Table.Head>
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
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each res.summary as card}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">{card.label}</Card.Title>
						{@const Icon = iconMap[card.icon as keyof typeof iconMap]}
						<Icon class="h-4 w-4 {card.color}" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{card.value}</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Table Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex w-full max-w-sm gap-2">
				<div class="relative flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
					<Input
						placeholder="Cari bahan..."
						class="h-10 pl-10"
						bind:value={searchQuery}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								executeSearch();
							}
						}}
					/>
				</div>
				<Button onclick={executeSearch} variant="secondary" class="h-10 gap-1">
					<Search class="size-4" /> Cari
				</Button>
			</div>
			<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
				<!-- Filter Dialog Trigger -->
				<Dialog.Root bind:open={showFilterDialog}>
					<Dialog.Trigger class="flex-1 sm:flex-none">
						{#snippet child({ props })}
							<Button
								{...props}
								variant="outline"
								class={cn(
									'relative h-10 w-full justify-center gap-2 bg-white px-3.5 sm:w-auto',
									hasActiveFilters && 'border-blue-500 bg-blue-50/50 font-medium text-blue-600'
								)}
							>
								<Filter class="size-4" />
								<span>Filter</span>
								{#if hasActiveFilters}
									<span
										class="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white"
									>
										{activeFilterCount}
									</span>
								{/if}
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content class="sm:max-w-[425px]">
						<Dialog.Header>
							<Dialog.Title>Filter Inventaris BHP</Dialog.Title>
							<Dialog.Description>
								Pilih kriteria kategori dan laboratorium untuk menyaring data.
							</Dialog.Description>
						</Dialog.Header>

						<div class="grid gap-4">
							<div class="grid gap-2">
								<Label for="filter-category" class="text-sm font-medium">Kategori</Label>
								<SearchableSelect.Root
									type="single"
									value={selectedCategoryId}
									onValueChange={handleCategoryChange}
								>
									<SearchableSelect.Trigger id="filter-category" class="h-10 w-full bg-white">
										{selectedCategoryName}
									</SearchableSelect.Trigger>
									<SearchableSelect.Content>
										<SearchableSelect.Item value="all" label="Semua Kategori">
											Semua Kategori
										</SearchableSelect.Item>
										{#each categories as cat}
											<SearchableSelect.Item value={cat.id} label={cat.name}>
												{cat.name}
											</SearchableSelect.Item>
										{/each}
									</SearchableSelect.Content>
								</SearchableSelect.Root>
							</div>

							{#if !['kepalaLab', 'laboran'].includes(data.user?.role)}
								<div class="grid gap-2">
									<Label for="filter-lab" class="text-sm font-medium">Laboratorium</Label>
									<Select.Root type="single" value={selectedLabId} onValueChange={handleLabChange}>
										<Select.Trigger id="filter-lab" class="h-10 w-full bg-white">
											{selectedLabName}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="all" label="Semua Laboratorium"
												>Semua Laboratorium</Select.Item
											>
											{#each laboratories as lab}
												<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{/if}
						</div>

						<Dialog.Footer
							class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-0"
						>
							{#if hasActiveFilters}
								<Button
									variant="ghost"
									onclick={clearFilters}
									class="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
								>
									<RotateCcw class="size-4" /> Reset Filter
								</Button>
							{:else}
								<div></div>
							{/if}
							<Button onclick={() => (showFilterDialog = false)}>Terapkan</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>

				<!-- Toggle Mode Tampilan -->
				<div class="flex flex-1 items-center gap-1 rounded-lg border bg-slate-50 p-1 sm:flex-none">
					<Button
						variant={viewMode === 'table' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 flex-1 text-xs font-medium sm:flex-none"
						onclick={() => handleViewChange('table')}
					>
						Tabel
					</Button>
					<Button
						variant={viewMode === 'grouped' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 flex-1 text-xs font-medium sm:flex-none"
						onclick={() => handleViewChange('grouped')}
					>
						Kelompok Kategori
					</Button>
				</div>

				{#if viewMode === 'table'}
					<div class="flex-1 sm:flex-none">
						<Select.Root
							type="single"
							value={res.pagination.limit.toString()}
							onValueChange={handleLimitChange}
						>
							<Select.Trigger class="h-10 w-full sm:w-27.5">
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
				{/if}
			</div>
		</div>

		{#if viewMode === 'grouped'}
			{@const groups = getBhpGroups(res.items, categories)}
			{#if groups.length === 0}
				<div class="rounded-md border bg-white p-8 text-center text-muted-foreground">
					Data tidak ditemukan.
				</div>
			{:else}
				<Accordion.Root
					type="multiple"
					value={groups.map((g) => g.key)}
					class="grid w-full grid-cols-1 gap-3 md:grid-cols-2"
				>
					{#each groups as group (group.key)}
						<Accordion.Item
							value={group.key}
							class="h-fit rounded-md border bg-white px-4 shadow-sm"
						>
							<Accordion.Trigger class="py-4 hover:no-underline">
								<div class="flex items-center gap-2">
									<span class="font-semibold text-slate-900">{group.name}</span>
									<Badge variant="secondary" class="ml-1 text-xs">{group.items.length} item</Badge>
								</div>
							</Accordion.Trigger>
							<Accordion.Content class="pt-1 pb-4">
								<div class="divide-y rounded-md border border-slate-100 bg-slate-50/50">
									{#each group.items as item (item.id)}
										<div
											class="flex items-center justify-between p-3 transition-colors hover:bg-slate-100/60"
										>
											<div class="flex flex-col">
												<div class="flex items-center gap-2">
													<span class="font-medium text-slate-900">{item.name}</span>
													{#if shouldShowNewBadge(item.createdAt, item.hideNewBadge)}
														<Badge
															class="bg-blue-500 px-1.5 py-0 text-[10px] font-semibold text-white"
															>Baru</Badge
														>
													{/if}
												</div>
												<span class="text-xs text-slate-500">
													Total Stok: {item.totalQty}
													{item.baseUnit} (Status: {item.status})
												</span>
											</div>
											<Button href="/admin/inventaris/bhp/{item.id}" size="icon" variant="outline">
												<Eye />
											</Button>
										</div>
									{/each}
								</div>
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			{/if}
		{:else}
			<!-- Data Table -->
			<div class="rounded-md border bg-white shadow-sm">
				<div class="overflow-x-auto">
					<Table.Root class="block md:table">
						<Table.Header class="hidden md:table-header-group">
							<Table.Row class="md:table-row">
								<Table.Head class="px-6 py-4">
									<div class="flex items-center gap-1">
										<span>Nama Bahan</span>
										<Tooltip.Provider>
											<Tooltip.Root>
												<Tooltip.Trigger>
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6 p-0 hover:bg-slate-100"
														onclick={toggleSort}
														title="Sortir berdasarkan abjad"
													>
														{#if currentSort === 'asc'}
															<ArrowUpNarrowWide class="h-4 w-4 font-bold text-blue-600" />
														{:else if currentSort === 'desc'}
															<ArrowDownWideNarrow class="h-4 w-4 font-bold text-blue-600" />
														{:else}
															<ArrowUpNarrowWide class="h-4 w-4 text-slate-400 opacity-50" />
														{/if}
													</Button>
												</Tooltip.Trigger>
												<Tooltip.Content side="top">
													Sortir berdasarkan abjad {currentSort === 'asc'
														? '(A-Z)'
														: currentSort === 'desc'
															? '(Z-A)'
															: ''}
												</Tooltip.Content>
											</Tooltip.Root>
										</Tooltip.Provider>
									</div>
								</Table.Head>
								<Table.Head>Stok Sekarang</Table.Head>
								<Table.Head>Stok Minimum</Table.Head>
								<Table.Head>Satuan</Table.Head>
								<Table.Head>Status</Table.Head>
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
										<!-- Nama Bahan + Mobile status/expand -->
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:py-4 md:pl-6"
										>
											<div class="flex flex-col">
												<div class="flex items-center gap-2">
													<span class="font-bold text-slate-900 md:font-medium">{item.name}</span>
													{#if shouldShowNewBadge(item.createdAt, item.hideNewBadge)}
														<Badge
															class="bg-blue-500 px-1.5 py-0 text-[10px] font-semibold text-white hover:bg-blue-600"
															>Baru</Badge
														>
													{/if}
													<Badge
														variant={item.status === 'AMAN'
															? 'default'
															: item.status === 'RENDAH'
																? 'outline'
																: 'destructive'}
														class={cn(
															'px-1.5 py-0.5 text-[9px] md:hidden',
															item.status === 'AMAN'
																? 'bg-green-100 text-green-700 hover:bg-green-100'
																: item.status === 'RENDAH'
																	? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
																	: ''
														)}
													>
														{item.status === 'AMAN'
															? 'Aman'
															: item.status === 'RENDAH'
																? 'Stok Rendah'
																: 'Habis'}
													</Badge>
												</div>
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

										<!-- Stok Sekarang -->
										<Table.Cell
											class={cn(
												expandedItems[item.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-3'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Stok Sekarang</span
											>
											<span class="text-sm text-slate-600">{item.totalQty}</span>
										</Table.Cell>

										<!-- Stok Minimum -->
										<Table.Cell
											class={cn(
												expandedItems[item.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-3'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Stok Minimum</span
											>
											<span class="text-sm text-slate-600">{item.minStock}</span>
										</Table.Cell>

										<!-- Satuan -->
										<Table.Cell
											class={cn(
												expandedItems[item.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-3'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Satuan</span>
											<span class="text-sm text-slate-600">{item.baseUnit}</span>
										</Table.Cell>

										<!-- Status (Desktop only) -->
										<Table.Cell class="hidden md:table-cell md:border-b md:py-4 md:pl-3">
											<Badge
												variant={item.status === 'AMAN'
													? 'default'
													: item.status === 'RENDAH'
														? 'outline'
														: 'destructive'}
												class={item.status === 'AMAN'
													? 'bg-green-100 text-green-700 hover:bg-green-100'
													: item.status === 'RENDAH'
														? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
														: ''}
											>
												{item.status === 'AMAN'
													? 'Aman'
													: item.status === 'RENDAH'
														? 'Stok Rendah'
														: 'Habis'}
											</Badge>
										</Table.Cell>

										<!-- Aksi -->
										<Table.Cell
											class={cn(
												expandedItems[item.id] ? 'flex' : 'hidden',
												'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2 md:text-right'
											)}
										>
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													{#snippet child({ props })}
														<Button {...props} variant="ghost" size="icon" class="h-8 w-8">
															<MoreHorizontal class="h-4 w-4" />
														</Button>
													{/snippet}
												</DropdownMenu.Trigger>
												<DropdownMenu.Content align="end">
													<DropdownMenu.Label>Aksi</DropdownMenu.Label>
													<a href="/admin/inventaris/bhp/{item.id}">
														<DropdownMenu.Item>
															<Eye /> Detail
														</DropdownMenu.Item>
													</a>
													<DropdownMenu.Separator />
													<DropdownMenu.Item onclick={() => openStockModal(item)}>
														<ArrowUpDown /> Ubah Stok
													</DropdownMenu.Item>
													<DropdownMenu.Separator />
													<a href="/admin/inventaris/bhp/{item.id}/edit">
														<DropdownMenu.Item>
															<FileEdit /> Edit
														</DropdownMenu.Item>
													</a>
													<DropdownMenu.Separator />
												</DropdownMenu.Content>
											</DropdownMenu.Root>
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
						)} dari {res.pagination.totalItems} bahan
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
		{/if}
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

<!-- Ubah Stok Modal -->
<AlertDialog.Root bind:open={showStockModal}>
	<AlertDialog.Content class="scrollbar-elegant max-h-[90vh] max-w-lg overflow-y-auto">
		<AlertDialog.Header>
			<AlertDialog.Title class="text-xl font-bold">Ubah Stok</AlertDialog.Title>
			<AlertDialog.Description class="sr-only">
				Form ubah stok Bahan Habis Pakai
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="space-y-4">
			{#if isRestrictedLabUser}
				<p class="text-sm text-gray-500">
					Laboratorium: <strong>{data.user?.laboratorium?.name ?? '-'}</strong>
				</p>
			{:else}
				<div class="flex flex-col gap-2">
					<Label for="stockLab">Laboratorium</Label>
					<Select.Root type="single" bind:value={stockLaboratoriumId}>
						<Select.Trigger class="w-full text-left">
							{laboratoriumList.find((l) => l.id === stockLaboratoriumId)?.name ??
								'Pilih Laboratorium'}
						</Select.Trigger>
						<Select.Content>
							{#each laboratoriumList as lab}
								<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Label for="stockRowSelect">Merk / Varian Stok</Label>
				{#if currentLabStocks.length === 0 && stockEventType !== 'RECEIVE'}
					<div class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-500">
						Tidak ada varian/stok yang tersedia di laboratorium ini.
					</div>
				{:else}
					<Select.Root
						type="single"
						value={isNewVariant ? 'new' : selectedStockRowId}
						onValueChange={(val) => {
							if (val === 'new') {
								isNewVariant = true;
								selectedStockRowId = '';
							} else {
								isNewVariant = false;
								selectedStockRowId = val;
							}
						}}
					>
						<Select.Trigger class="w-full text-left">
							{#if isNewVariant}
								Tambah Merk/Varian Baru
							{:else if selectedStockRow}
								{selectedStockRow.brand}
								{#if selectedStockRow.variant}
									({selectedStockRow.variant})
								{/if}
								- Sisa: {selectedStockRow.qty}
								{stockItem?.baseUnit}
							{:else}
								Pilih Merk/Varian...
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each currentLabStocks as s}
								<Select.Item
									value={s.id}
									label={`${s.brand} (${s.variant}) - Sisa: ${s.qty} ${stockItem?.baseUnit}`}
								>
									{s.brand}
									{#if s.variant}
										({s.variant})
									{/if}
									- Sisa: {s.qty}
									{stockItem?.baseUnit}
								</Select.Item>
							{/each}
							{#if stockEventType === 'RECEIVE'}
								<Select.Item value="new" label="Tambah Merk/Varian Baru">
									+ Tambah Merk/Varian Baru
								</Select.Item>
							{/if}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>

			{#if isNewVariant && stockEventType === 'RECEIVE'}
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-2">
						<Label for="stockBrand">Merk / Brand</Label>
						<Input
							type="text"
							id="stockBrand"
							bind:value={stockBrand}
							placeholder="Contoh: OneMed"
						/>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="stockVariant">Varian / Ukuran</Label>
						<Input
							type="text"
							id="stockVariant"
							bind:value={stockVariant}
							placeholder="Contoh: 500ml"
						/>
					</div>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Label for="stockType">Tipe Perubahan</Label>
				<Select.Root type="single" bind:value={stockEventType}>
					<Select.Trigger class="w-full text-left">{stockEventTrigger}</Select.Trigger>
					<Select.Content>
						{#each eventTypeOptions as opt}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="stockQty">
					{#if stockEventType === 'RECEIVE'}
						Jumlah Masuk ({stockItem?.baseUnit ?? ''})
					{:else if stockEventType === 'ISSUE'}
						Jumlah Keluar ({stockItem?.baseUnit ?? ''})
					{:else}
						Stok Akhir ({stockItem?.baseUnit ?? ''})
					{/if}
				</Label>
				<Input
					type="number"
					id="stockQty"
					min="0"
					bind:value={stockQty}
					placeholder="Masukkan jumlah..."
				/>
				{#if stockItem}
					<div class="text-xs text-gray-400">
						Stok sekarang: {stockItem.totalQty} | Minimum: {stockItem.minStock}
					</div>
				{/if}
			</div>

			{#if stockEventType === 'RECEIVE'}
				<div class="flex flex-col gap-2">
					<Label for="stockExpiryDate">Tanggal Kedaluwarsa (Opsional)</Label>
					<Input type="date" id="stockExpiryDate" bind:value={stockExpiryDate} />
					<p class="text-xs text-gray-400">
						Kosongkan jika batch stok ini tidak memiliki tanggal kedaluwarsa.
					</p>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Label for="stockNotes">Catatan (Opsional)</Label>
				<Textarea
					id="stockNotes"
					bind:value={stockNotes}
					placeholder="Catatan perubahan stok..."
					class="min-h-20"
				/>
			</div>
		</div>

		<AlertDialog.Footer class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<AlertDialog.Cancel disabled={stockLoading}>Batal</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={(e) => {
					e.preventDefault();
					submitStockChange();
				}}
				disabled={stockLoading}
				class="bg-[#2D5A43] hover:bg-[#234735]"
			>
				{stockLoading ? 'Menyimpan...' : 'Simpan'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<ExportPeriodicReportDialog
	bind:open={showExportDialog}
	reportLabel="Laporan Stok Bahan Habis Pakai"
	exportBasePath="/admin/laporan/inventaris/bhp/export"
	labs={laboratories}
	isRestrictedLabUser={['kepalaLab', 'laboran'].includes(data.user?.role)}
	userLabId={data.user?.laboratorium?.id ?? ''}
/>
