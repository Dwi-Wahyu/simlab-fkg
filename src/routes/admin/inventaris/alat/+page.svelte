<script lang="ts">
	import {
		Activity,
		AlertCircle,
		AlertTriangle,
		CheckCircle,
		Database,
		Eye,
		FileEdit,
		MoreHorizontal,
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
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils';

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

<div class="flex flex-col gap-6 p-4 md:p-8">
	<div class="flex flex-col gap-2">
		<h1 class="text-2xl font-bold tracking-tight text-slate-900">Inventaris Alat</h1>
		<p class="text-slate-500">Manajemen aset dan peralatan laboratorium.</p>
	</div>

	{#await data.alatPromise}
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
							<Table.Head>Nama Alat</Table.Head>
							<Table.Head>Serial Number</Table.Head>
							<Table.Head>Merk</Table.Head>
							<Table.Head>Lokasi</Table.Head>
							<Table.Head>Kondisi</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each Array(5) as _}
							<Table.Row>
								{#each Array(7) as _}
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
					placeholder="Cari alat..."
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
					<Select.Trigger class="w-[110px]">
						{res.pagination.limit} / Hal
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10" label="10 / Halaman">10 / Hal</Select.Item>
						<Select.Item value="25" label="25 / Halaman">25 / Hal</Select.Item>
						<Select.Item value="50" label="50 / Halaman">50 / Hal</Select.Item>
						<Select.Item value="100" label="100 / Halaman">100 / Hal</Select.Item>
					</Select.Content>
				</Select.Root>
				<Button href="/admin/inventaris/tambah" class="bg-[#2D5A43] hover:bg-[#234735]">
					<Plus class="mr-2 h-4 w-4" /> Tambah Alat
				</Button>
			</div>
		</div>

		<!-- Data Table -->
		<div class="rounded-md border bg-white shadow-sm">
			<div class="overflow-x-auto">
				<Table.Root class="block md:table">
					<Table.Header class="hidden md:table-header-group">
						<Table.Row class="md:table-row">
							<Table.Head class="px-6 py-4">Nama Alat</Table.Head>
							<Table.Head>Serial Number</Table.Head>
							<Table.Head>Merk</Table.Head>
							<Table.Head>Lokasi</Table.Head>
							<Table.Head>Kondisi</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="pr-6 text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#if res.items.length === 0}
							<Table.Row class="flex flex-col md:table-row">
								<Table.Cell colspan={7} class="py-10 text-center text-muted-foreground md:table-cell">
									Data tidak ditemukan.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each res.items as item (item.id)}
								<Table.Row
									class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
								>
									<!-- Nama Alat + Mobile status/expand -->
									<Table.Cell
										class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
									>
										<div class="flex flex-col">
											<div class="flex items-center gap-2">
												<span class="font-bold text-slate-900 md:font-medium">{item.name}</span>
												<Badge
													variant="outline"
													class={cn(
														'px-1.5 py-0.5 text-[9px] md:hidden',
														item.status === 'READY'
															? 'border-green-200 text-green-600'
															: item.status === 'IN_USE'
																? 'border-blue-200 text-blue-600'
																: 'border-red-200 text-red-600'
													)}
												>
													{item.status}
												</Badge>
											</div>
											<div class="mt-0.5 text-xs text-muted-foreground uppercase">
												{item.brand}
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

									<!-- Serial Number -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Serial Number</span>
										<span class="text-sm text-slate-600">{item.serialNumber}</span>
									</Table.Cell>

									<!-- Merk (Hidden on mobile as it's in the first cell) -->
									<Table.Cell class="hidden md:table-cell md:border-b md:px-6 md:py-4">
										{item.brand}
									</Table.Cell>

									<!-- Lokasi -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Lokasi</span>
										<span class="text-sm text-slate-600">{item.warehouse}</span>
									</Table.Cell>

									<!-- Kondisi -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Kondisi</span>
										<Badge
											variant={item.condition === 'BAIK'
												? 'default'
												: item.condition === 'RUSAK_RINGAN'
													? 'outline'
													: 'destructive'}
											class={cn(
												'w-fit',
												item.condition === 'BAIK'
													? 'bg-green-100 text-green-700 hover:bg-green-100'
													: item.condition === 'RUSAK_RINGAN'
														? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
														: ''
											)}
										>
											{item.condition === 'BAIK'
												? 'Baik'
												: item.condition === 'RUSAK_RINGAN'
													? 'Sedang'
													: 'Rusak'}
										</Badge>
									</Table.Cell>

									<!-- Status (Desktop only) -->
									<Table.Cell class="hidden md:table-cell md:border-b md:px-6 md:py-4">
										<Badge
											variant="outline"
											class={item.status === 'READY'
												? 'border-green-200 text-green-600'
												: item.status === 'IN_USE'
													? 'border-blue-200 text-blue-600'
													: 'border-red-200 text-red-600'}
										>
											{item.status}
										</Badge>
									</Table.Cell>

									<!-- Aksi -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4 md:text-right'
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
												<DropdownMenu.Item href="/admin/inventori/{item.id}">
													<Eye class="mr-2 h-4 w-4" /> Detail
												</DropdownMenu.Item>
												<DropdownMenu.Item href="/admin/inventori/{item.id}/edit">
													<FileEdit class="mr-2 h-4 w-4" /> Edit
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item class="text-red-600">
													<Trash2 class="mr-2 h-4 w-4" /> Hapus
												</DropdownMenu.Item>
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
