<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import {
		AlertTriangle,
		ChevronDown,
		ChevronUp,
		Radiation,
		ShieldAlert,
		Trash2,
		TrendingUp,
		User
	} from '@lucide/svelte';
	import Button from '@/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { cn } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { incidents, wasteLogs, stats } = $derived(data);

	// Enum Mappings for display
	const severityMap = {
		LOW: {
			label: 'Rendah',
			variant: 'outline' as const,
			class: 'border-green-500 text-green-600'
		},
		MEDIUM: {
			label: 'Sedang',
			variant: 'outline' as const,
			class: 'border-yellow-500 text-yellow-600'
		},
		HIGH: {
			label: 'Tinggi',
			variant: 'outline' as const,
			class: 'border-red-500 text-red-600'
		}
	};

	const incidentStatusMap = {
		REPORTED: { label: 'Dilaporkan', class: 'bg-blue-100 text-blue-700' },
		INVESTIGATING: {
			label: 'Investigasi',
			class: 'bg-yellow-100 text-yellow-700'
		},
		ACTION_PLAN: {
			label: 'Rencana Tindakan',
			class: 'bg-orange-100 text-orange-700'
		},
		MONITORING: { label: 'Pemantauan', class: 'bg-indigo-100 text-indigo-700' },
		CLOSED: { label: 'Selesai', class: 'bg-green-100 text-green-700' }
	};

	const wasteTypeMap = {
		INFEKSIUS: {
			label: 'Infeksius',
			class: 'bg-red-50 text-red-700 border-red-200'
		},
		TAJAM: {
			label: 'Benda Tajam',
			class: 'bg-orange-50 text-orange-700 border-orange-200'
		},
		KIMIA: {
			label: 'Bahan Kimia',
			class: 'bg-yellow-50 text-yellow-700 border-yellow-200'
		},
		RADIOAKTIF: {
			label: 'Radioaktif',
			class: 'bg-purple-50 text-purple-700 border-purple-200'
		}
	};

	const disposalStatusMap = {
		STORED: { label: 'Disimpan', class: 'bg-gray-100 text-gray-700' },
		COLLECTED_BY_THIRD_PARTY: {
			label: 'Diambil Pihak Ke-3',
			class: 'bg-blue-100 text-blue-700'
		},
		INCINERATED: { label: 'Insinerasi', class: 'bg-green-100 text-green-700' }
	};

	function formatDate(date: Date | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(new Date(date));
	}

	let activeTab = $state('k3');
	let expandedIncidents = $state<Record<string, boolean>>({});
	let expandedWastes = $state<Record<string, boolean>>({});

	// Tab Persistence Logic
	$effect(() => {
		const tab = page.url.searchParams.get('tab');
		if (tab && tab !== activeTab) {
			activeTab = tab;
		}
	});

	function handleTabChange(value: string) {
		activeTab = value;
		const url = new URL(page.url);
		url.searchParams.set('tab', value);
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<div class="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">Manajemen Limbah & K3</h1>
			<p class="text-slate-500">Keselamatan kerja, pengelolaan limbah, dan kepatuhan lingkungan.</p>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Insiden Bulan Ini -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Insiden Bulan Ini</Card.Title>
				<AlertTriangle class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.incidentsThisMonth}</div>
				<p class="text-xs text-muted-foreground">
					{stats.closedIncidentsThisMonth} selesai ditangani
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Zero Major Incident -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Major Incident</Card.Title>
				<ShieldAlert class="h-4 w-4 {stats.hasMajorIncident ? 'text-red-500' : 'text-green-500'}" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{stats.hasMajorIncident ? 'Major Incident' : 'Zero Major Incident'}
				</div>
				<p class="text-xs text-muted-foreground">
					{stats.hasMajorIncident ? 'Terdapat insiden kritikal' : 'Tidak ada insiden kritikal'}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Limbah B3 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Limbah B3 Bulan Ini</Card.Title>
				<Trash2 class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.totalWasteKg.toFixed(1)}</div>
				<p class="text-xs text-muted-foreground">kg/liter • Terbuang dengan benar</p>
			</Card.Content>
		</Card.Root>

		<!-- Kepatuhan K3 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Kepatuhan K3</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.k3Compliance}%</div>
				<div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
					<div
						class="h-full bg-primary transition-all duration-500 ease-in-out"
						style="width: {stats.k3Compliance}%"
					></div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Tabs Area -->
	<Tabs.Root bind:value={activeTab} onValueChange={handleTabChange} class="w-full">
		<Tabs.List variant="default" class="mb-4 w-full">
			<Tabs.Trigger value="k3" class="h-10 cursor-pointer">K3 & Insiden</Tabs.Trigger>
			<Tabs.Trigger value="limbah" class="h-10 cursor-pointer">Limbah</Tabs.Trigger>
		</Tabs.List>

		<Card.Root mobileAware={true}>
			<Card.Header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="hidden md:block">
					<Card.Title class="text-xl">
						{#if activeTab === 'k3'}
							Laporan Insiden Keselamatan
						{:else}
							Log Pembuangan Limbah
						{/if}
					</Card.Title>
					<Card.Description class="mt-1 text-sm text-muted-foreground">
						{#if activeTab === 'k3'}
							Riwayat insiden dan CAPA (Corrective and Preventive Action)
						{:else}
							Monitoring volume dan status pembuangan limbah B3
						{/if}
					</Card.Description>
				</div>
				<div class="flex w-full flex-col items-center gap-4 sm:w-auto md:flex-row">
					{#if activeTab === 'k3'}
						<Button href="/admin/limbah-k3/pencatatan-insiden" class="w-full  md:w-fit">
							<ShieldAlert />
							Laporkan Insiden
						</Button>
					{:else}
						<Button href="/admin/limbah-k3/pencatatan" class="w-full  md:w-fit">
							<Radiation />
							Catat Limbah
						</Button>
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				<!-- K3 & Insiden Content -->
				<Tabs.Content value="k3" class="m-0 p-0">
					<div class="overflow-x-auto">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head class="w-[80px] px-6 py-4">ID</Table.Head>
									<Table.Head>Insiden</Table.Head>
									<Table.Head>Tanggal</Table.Head>
									<Table.Head>Tingkat</Table.Head>
									<Table.Head>Pelapor</Table.Head>
									<Table.Head>CAPA</Table.Head>
									<Table.Head>Status</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#each incidents as incident (incident.id)}
									<Table.Row
										class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
									>
										<!-- Column 1: ID (hidden on mobile, shown in Column 2 on mobile) -->
										<Table.Cell
											class="hidden font-mono text-xs text-muted-foreground md:table-cell md:border-b md:px-6 md:py-4"
										>
											{incident.id.slice(0, 8)}
										</Table.Cell>

										<!-- Column 2: Insiden details -->
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
										>
											<div class="flex flex-col">
												<div class="flex items-center gap-2">
													<span class="font-bold text-slate-900 md:font-medium"
														>{incident.title}</span
													>
													<Badge
														variant={severityMap[incident.severity].variant}
														class={cn(
															severityMap[incident.severity].class,
															'px-1.5 py-0.5 text-[9px] md:hidden'
														)}
													>
														{severityMap[incident.severity].label}
													</Badge>
												</div>
												<div class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
													{incident.description || '-'}
												</div>
												<span class="mt-1 font-mono text-[10px] text-slate-400 md:hidden"
													>ID: {incident.id.slice(0, 8)}</span
												>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="ml-4 h-8 w-8 shrink-0 md:hidden"
												onclick={() =>
													(expandedIncidents[incident.id] = !expandedIncidents[incident.id])}
												aria-label="Expand row"
											>
												{#if expandedIncidents[incident.id]}
													<ChevronUp class="h-4 w-4" />
												{:else}
													<ChevronDown class="h-4 w-4" />
												{/if}
											</Button>
										</Table.Cell>

										<!-- Column 3: Tanggal -->
										<Table.Cell
											class={cn(
												expandedIncidents[incident.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Tanggal</span>
											<span
												class="text-sm font-medium text-slate-900 md:font-normal md:text-slate-600"
												>{formatDate(incident.incidentDate)}</span
											>
										</Table.Cell>

										<!-- Column 4: Tingkat (hidden on mobile header style) -->
										<Table.Cell
											class={cn(
												expandedIncidents[incident.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Tingkat</span>
											<Badge
												variant={severityMap[incident.severity].variant}
												class={cn('w-fit', severityMap[incident.severity].class)}
											>
												{severityMap[incident.severity].label}
											</Badge>
										</Table.Cell>

										<!-- Column 5: Pelapor -->
										<Table.Cell
											class={cn(
												expandedIncidents[incident.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Pelapor</span>
											<span class="text-sm text-slate-600">{incident.reporterName || '-'}</span>
										</Table.Cell>

										<!-- Column 6: CAPA -->
										<Table.Cell
											class={cn(
												expandedIncidents[incident.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">CAPA</span>
											{#if incident.capa}
												<Badge variant="secondary" class="w-fit font-normal">
													{incident.capa}
												</Badge>
											{:else}
												<span class="text-xs text-muted-foreground italic">Belum ada</span>
											{/if}
										</Table.Cell>

										<!-- Column 7: Status -->
										<Table.Cell
											class={cn(
												expandedIncidents[incident.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Status</span>
											<div
												class={cn(
													'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none',
													incidentStatusMap[incident.status].class
												)}
											>
												{incidentStatusMap[incident.status].label}
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row class="flex flex-col md:table-row">
										<Table.Cell colspan={7} class="h-24 text-center md:table-cell">
											Tidak ada laporan insiden.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Tabs.Content>

				<!-- Limbah Content -->
				<Tabs.Content value="limbah" class="m-0 p-0">
					<div class="overflow-x-auto">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head class="px-6 py-4">ID</Table.Head>
									<Table.Head>Jenis Limbah</Table.Head>
									<Table.Head>Berat (g)</Table.Head>
									<Table.Head>Laboratorium</Table.Head>
									<Table.Head>PIC</Table.Head>
									<Table.Head>Status Pembuangan</Table.Head>
									<Table.Head>Tanggal</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#each wasteLogs as log (log.id)}
									<Table.Row
										class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
									>
										<!-- Column 1: ID (hidden on mobile, shown in Column 2 on mobile) -->
										<Table.Cell
											class="hidden font-mono text-xs text-muted-foreground md:table-cell md:border-b md:px-6 md:py-4"
										>
											{log.id.slice(0, 8)}
										</Table.Cell>

										<!-- Column 2: Jenis Limbah details -->
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
										>
											<div class="flex flex-col gap-1">
												<Badge
													variant="outline"
													class={cn('w-fit font-medium', wasteTypeMap[log.wasteType].class)}
												>
													{wasteTypeMap[log.wasteType].label}
												</Badge>
												<span class="font-mono text-[10px] text-slate-400 md:hidden"
													>ID: {log.id.slice(0, 8)}</span
												>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="ml-4 h-8 w-8 shrink-0 md:hidden"
												onclick={() => (expandedWastes[log.id] = !expandedWastes[log.id])}
												aria-label="Expand row"
											>
												{#if expandedWastes[log.id]}
													<ChevronUp class="h-4 w-4" />
												{:else}
													<ChevronDown class="h-4 w-4" />
												{/if}
											</Button>
										</Table.Cell>

										<!-- Column 3: Berat -->
										<Table.Cell
											class={cn(
												expandedWastes[log.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Berat (g)</span>
											<span class="text-sm font-medium text-slate-900 md:font-normal"
												>{log.weightGram} g</span
											>
										</Table.Cell>

										<!-- Column 4: Laboratorium -->
										<Table.Cell
											class={cn(
												expandedWastes[log.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Laboratorium</span
											>
											<span class="text-sm text-slate-600">{log.laboratorium?.name || '-'}</span>
										</Table.Cell>

										<!-- Column 5: PIC -->
										<Table.Cell
											class={cn(
												expandedWastes[log.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">PIC</span>
											<div class="flex items-center gap-2">
												<div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
													<User class="h-3 w-3 text-muted-foreground" />
												</div>
												<span class="text-sm text-slate-600">{log.pic?.name || 'Anonim'}</span>
											</div>
										</Table.Cell>

										<!-- Column 6: Status Pembuangan -->
										<Table.Cell
											class={cn(
												expandedWastes[log.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Status Pembuangan</span
											>
											<div
												class={cn(
													'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
													disposalStatusMap[log.disposalStatus || 'STORED'].class
												)}
											>
												{disposalStatusMap[log.disposalStatus || 'STORED'].label}
											</div>
										</Table.Cell>

										<!-- Column 7: Tanggal -->
										<Table.Cell
											class={cn(
												expandedWastes[log.id] ? 'flex' : 'hidden',
												'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
											)}
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Tanggal</span>
											<span class="text-sm text-slate-600">{formatDate(log.createdAt)}</span>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row class="flex flex-col md:table-row">
										<Table.Cell colspan={7} class="h-24 text-center md:table-cell">
											Tidak ada log pembuangan limbah.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Tabs.Content>
			</Card.Content>
		</Card.Root>
	</Tabs.Root>
</div>
