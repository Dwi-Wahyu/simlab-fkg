<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import Modal from '$lib/components/Modal.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from '$lib/components/toast';
	import {
		Database,
		ShieldCheck,
		AlertCircle,
		Trash2,
		Search,
		Plus,
		MoreHorizontal,
		FileEdit,
		Eye,
		XCircle,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronDown,
		ChevronUp,
		ArrowUpDown
	} from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { goto, invalidateAll } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils';

	let { data } = $props();

	// Map icon strings to components
	const iconMap = {
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
		goto(url.toString(), { keepFocus: true });
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

	// ─── Ubah Stok Modal ───
	let showStockModal = $state(false);
	let stockLoading = $state(false);
	let stockItem = $state<{
		id: string;
		name: string;
		totalQty: number;
		minStock: number;
		baseUnit: string;
	} | null>(null);
	let stockEventType = $state<'RECEIVE' | 'ISSUE' | 'ADJUSTMENT'>('RECEIVE');
	let stockQty = $state<number>(0);
	let stockNotes = $state('');
	let stockLaboratoriumId = $state('');
	let laboratoriumList = $state<{ id: string; name: string }[]>([]);

	const isKepalaLab = $derived(data.user?.role === 'kepalaLab');
	const userLabId = $derived(data.user?.laboratorium?.id ?? '');

	$effect(() => {
		if (isKepalaLab && userLabId) {
			stockLaboratoriumId = userLabId;
		}
	});

	const eventTypeOptions = [
		{ value: 'RECEIVE', label: 'Masuk (Receive)' },
		{ value: 'ISSUE', label: 'Keluar (Issue)' },
		{ value: 'ADJUSTMENT', label: 'Penyesuaian (Adjustment)' }
	];
	const stockEventTrigger = $derived(
		eventTypeOptions.find((o) => o.value === stockEventType)?.label ?? 'Pilih Tipe'
	);

	function openStockModal(item: {
		id: string;
		name: string;
		totalQty: number;
		minStock: number;
		baseUnit: string;
	}) {
		stockItem = item;
		stockEventType = 'RECEIVE';
		stockQty = 0;
		stockNotes = '';
		if (!isKepalaLab && laboratoriumList.length === 0) {
			fetch('/api/admin/laboratorium')
				.then((r) => r.json())
				.then((labs) => (laboratoriumList = labs));
		}
		showStockModal = true;
	}

	async function submitStockChange() {
		if (!stockItem || stockQty == null) return;
		const labId = isKepalaLab ? userLabId : stockLaboratoriumId;
		if (!labId) {
			toast.destructive('Gagal', { description: 'Pilih laboratorium terlebih dahulu.' });
			return;
		}

		// Client-side validation
		if (stockEventType === 'ISSUE' && stockItem.totalQty - stockQty < 0) {
			toast.destructive('Stok Tidak Mencukupi', {
				description: `Stok saat ini hanya ${stockItem.totalQty} ${stockItem.baseUnit}.`
			});
			return;
		}
		if (stockEventType === 'ISSUE' && stockItem.totalQty - stockQty < stockItem.minStock) {
			toast.destructive('Di Bawah Minimum', {
				description: `Hasil stok (${stockItem.totalQty - stockQty}) akan di bawah minimum (${stockItem.minStock}).`
			});
			return;
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
					laboratoriumId: labId
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

<div class="flex flex-col gap-6 p-4 md:p-8">
	<div class="flex flex-col gap-2">
		<h1 class="text-2xl font-bold tracking-tight text-slate-900">Inventaris Bahan Habis Pakai</h1>
		<p class="text-slate-500">Manajemen stok bahan dan konsumsi laboratorium.</p>
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
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					placeholder="Cari bahan..."
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
					<Plus /> Tambah Bahan
				</Button>
			</div>
		</div>

		<!-- Data Table -->
		<div class="rounded-md border bg-white shadow-sm">
			<div class="overflow-x-auto">
				<Table.Root class="block md:table">
					<Table.Header class="hidden md:table-header-group">
						<Table.Row class="md:table-row">
							<Table.Head class="px-6 py-4">Nama Bahan</Table.Head>
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
										<span class="text-xs font-semibold text-slate-400 md:hidden">Stok Sekarang</span
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
										<span class="text-xs font-semibold text-slate-400 md:hidden">Stok Minimum</span>
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
												<DropdownMenu.Item onclick={() => openStockModal(item)}>
													<ArrowUpDown /> Ubah Stok
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<a href="/admin/inventaris/{item.id}/edit">
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
<Modal
	bind:show={showStockModal}
	title="Ubah Stok"
	onConfirm={submitStockChange}
	confirmLabel="Simpan"

	// {stockItem ? description: `${stockItem.name} (Stok: ${stockItem.totalQty} ${stockItem.baseUnit})` : ''}
>
	<div class="space-y-4">
		{#if isKepalaLab}
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
</Modal>
