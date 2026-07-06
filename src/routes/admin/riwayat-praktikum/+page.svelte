<script lang="ts">
	import {
		Award,
		BookOpen,
		Calendar,
		FileText,
		GraduationCap,
		User,
		Search,
		ChevronDown,
		ChevronUp,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		XCircle
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils';

	let { data } = $props();

	// Map icon strings to components
	const iconMap = {
		Award,
		BookOpen
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

	function formatDate(date: Date | null | undefined) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getScoreColor(score: number) {
		if (score >= 80) return 'text-emerald-600 border-emerald-200 bg-emerald-50';
		if (score >= 60) return 'text-blue-600 border-blue-200 bg-blue-50';
		if (score >= 40) return 'text-orange-600 border-orange-200 bg-orange-50';
		return 'text-red-600 border-red-200 bg-red-50';
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-col">
		<h1 class="text-3xl font-bold tracking-tight">Riwayat Hasil Praktikum</h1>

		<p class="text-slate-500">
			Daftar nilai dan feedback dari seluruh kegiatan praktikum yang telah diikuti.
		</p>
	</div>

	{#await data.riwayatPromise}
		<!-- Skeleton Summary Cards -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each Array(2) as _}
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
							<Table.Head>Kegiatan & Modul</Table.Head>
							<Table.Head>Laboratorium</Table.Head>
							<Table.Head>Waktu Pelaksanaan</Table.Head>
							<Table.Head>DPJP</Table.Head>
							<Table.Head class="text-center">Nilai</Table.Head>
							<Table.Head>Catatan</Table.Head>
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
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
			{#each res.summary as card}
				{@const Icon = iconMap[card.icon as keyof typeof iconMap]}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium text-slate-500">{card.label}</Card.Title>
						<div class={cn('rounded-full p-2', card.bg, card.color)}>
							<Icon class="h-5 w-5" />
						</div>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-slate-900">{card.value}</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Table Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					placeholder="Cari kegiatan, modul..."
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
			</div>
		</div>

		<!-- Data Table -->
		<div class="rounded-md border bg-white shadow-sm">
			<div class="overflow-x-auto">
				<Table.Root class="block md:table">
					<Table.Header class="hidden bg-slate-50/50 md:table-header-group">
						<Table.Row class="md:table-row">
							<Table.Head class="px-6 py-4">Kegiatan & Modul</Table.Head>
							<Table.Head>Laboratorium</Table.Head>
							<Table.Head>Waktu Pelaksanaan</Table.Head>
							<Table.Head>DPJP</Table.Head>
							<Table.Head class="text-center">Nilai</Table.Head>
							<Table.Head>Catatan</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#if res.items.length === 0}
							<Table.Row class="flex flex-col md:table-row">
								<Table.Cell
									colspan={6}
									class="py-10 text-center text-muted-foreground md:table-cell"
								>
									<div class="flex flex-col items-center justify-center gap-2">
										<FileText size={48} strokeWidth={1} class="text-slate-300" />
										<p>Data tidak ditemukan.</p>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each res.items as item (item.id)}
								<Table.Row
									class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
								>
									<!-- Kegiatan & Modul + Mobile expand -->
									<Table.Cell
										class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
									>
										<div class="flex flex-col">
											<div class="flex items-center gap-2">
												<span class="font-bold text-slate-900">{item.scheduleTitle}</span>
												<!-- Mobile Score Badge -->
												<Badge
													variant="outline"
													class={cn('ml-2 md:hidden', getScoreColor(item.score))}
												>
													{item.score}
												</Badge>
											</div>
											<span class="mt-1 flex items-center text-xs font-medium text-slate-500">
												{item.moduleName}
											</span>
											<span
												class="mt-0.5 text-[10px] font-medium tracking-wider text-slate-400 uppercase"
											>
												{item.blockName}
											</span>
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

									<!-- Laboratorium -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Laboratorium</span>
										<span class="text-sm font-medium text-slate-700">{item.laboratoriumName}</span>
									</Table.Cell>

									<!-- Waktu -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden"
											>Waktu Pelaksanaan</span
										>
										<div class="flex flex-col text-xs text-slate-600">
											<span class="flex items-center gap-1">
												<Calendar size={12} />
												{formatDate(item.startTime)}
											</span>
										</div>
									</Table.Cell>

									<!-- DPJP -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">DPJP</span>
										<div class="flex items-center gap-2">
											<div
												class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500"
											>
												<User size={12} />
											</div>
											<span class="text-sm font-medium text-slate-900">{item.instructorName}</span>
										</div>
									</Table.Cell>

									<!-- Nilai (Desktop only, mobile shows in header) -->
									<Table.Cell class="hidden text-center md:table-cell md:border-b md:px-6 md:py-4">
										<Badge
											variant="outline"
											class={cn('text-base font-bold', getScoreColor(item.score))}
										>
											{item.score}
										</Badge>
									</Table.Cell>

									<!-- Catatan -->
									<Table.Cell
										class={cn(
											expandedItems[item.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Catatan</span>
										{#if item.notes}
											<p class="line-clamp-2 text-xs text-slate-600 italic">"{item.notes}"</p>
										{:else}
											<span class="text-xs text-slate-400">-</span>
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
				<div class="text-sm text-slate-500">
					Menampilkan {(res.pagination.currentPage - 1) * res.pagination.limit + 1} sampai {Math.min(
						res.pagination.currentPage * res.pagination.limit,
						res.pagination.totalItems
					)} dari {res.pagination.totalItems} riwayat
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
						Halaman {res.pagination.currentPage} dari {res.pagination.totalPages || 1}
					</div>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						onclick={() => handlePageChange(res.pagination.currentPage + 1)}
						disabled={res.pagination.currentPage === (res.pagination.totalPages || 1)}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex"
						onclick={() => handlePageChange(res.pagination.totalPages)}
						disabled={res.pagination.currentPage === (res.pagination.totalPages || 1)}
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
