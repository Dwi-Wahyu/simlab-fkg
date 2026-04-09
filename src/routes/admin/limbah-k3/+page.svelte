<script lang="ts">
	import { base } from '$app/paths';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		AlertTriangle,
		CheckCircle2,
		Trash2,
		ShieldAlert,
		Calendar,
		User,
		ExternalLink,
		Info,
		TrendingUp
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import { cn } from '$lib/utils';
	import Button from '@/components/ui/button/button.svelte';

	let { data }: { data: PageData } = $props();

	const { incidents, wasteLogs, stats } = $derived(data);

	// Enum Mappings for display
	const severityMap = {
		LOW: { label: 'Rendah', variant: 'outline' as const, class: 'border-green-500 text-green-600' },
		MEDIUM: {
			label: 'Sedang',
			variant: 'outline' as const,
			class: 'border-yellow-500 text-yellow-600'
		},
		HIGH: { label: 'Tinggi', variant: 'outline' as const, class: 'border-red-500 text-red-600' }
	};

	const incidentStatusMap = {
		REPORTED: { label: 'Dilaporkan', class: 'bg-blue-100 text-blue-700' },
		INVESTIGATING: { label: 'Investigasi', class: 'bg-yellow-100 text-yellow-700' },
		ACTION_PLAN: { label: 'Rencana Tindakan', class: 'bg-orange-100 text-orange-700' },
		MONITORING: { label: 'Pemantauan', class: 'bg-indigo-100 text-indigo-700' },
		CLOSED: { label: 'Selesai', class: 'bg-green-100 text-green-700' }
	};

	const wasteTypeMap = {
		INFEKSIUS: { label: 'Infeksius', class: 'bg-red-50 text-red-700 border-red-200' },
		TAJAM: { label: 'Benda Tajam', class: 'bg-orange-50 text-orange-700 border-orange-200' },
		KIMIA: { label: 'Bahan Kimia', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
		RADIOAKTIF: { label: 'Radioaktif', class: 'bg-purple-50 text-purple-700 border-purple-200' }
	};

	const disposalStatusMap = {
		STORED: { label: 'Disimpan', class: 'bg-gray-100 text-gray-700' },
		COLLECTED_BY_THIRD_PARTY: { label: 'Diambil Pihak Ke-3', class: 'bg-blue-100 text-blue-700' },
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
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-row items-center justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">Manajemen Limbah & K3</h1>
			<p class="text-muted-foreground">Keselamatan kerja, pengelolaan limbah, dan kepatuhan lingkungan.</p>
		</div>
		<div class="flex gap-2">
			<Button href="{base}/admin/limbah-k3/pencatatan-insiden" variant="outline" class="gap-2">
				<ShieldAlert class="h-4 w-4" />
				Laporkan Insiden
			</Button>
			<Button href="{base}/admin/limbah-k3/pencatatan" class="gap-2">
				<Trash2 class="h-4 w-4" />
				Catat Limbah
			</Button>
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

	<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)} class="w-full space-y-4">
		<Tabs.List class="w-full">
			<Tabs.Trigger value="k3">K3 & Insiden</Tabs.Trigger>
			<Tabs.Trigger value="limbah">Limbah</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="k3" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Laporan Insiden Keselamatan</Card.Title>
					<Card.Description
						>Riwayat insiden dan CAPA (Corrective and Preventive Action)</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-[80px]">ID</Table.Head>
									<Table.Head>Insiden</Table.Head>
									<Table.Head>Tanggal</Table.Head>
									<Table.Head>Tingkat</Table.Head>
									<Table.Head>Pelapor</Table.Head>
									<Table.Head>CAPA</Table.Head>
									<Table.Head>Status</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each incidents as incident (incident.id)}
									<Table.Row>
										<Table.Cell class="font-mono text-xs text-muted-foreground">
											{incident.id.slice(0, 8)}
										</Table.Cell>
										<Table.Cell>
											<div class="font-medium">{incident.title}</div>
											<div class="line-clamp-1 text-xs text-muted-foreground">
												{incident.description || '-'}
											</div>
										</Table.Cell>
										<Table.Cell>{formatDate(incident.incidentDate)}</Table.Cell>
										<Table.Cell>
											<Badge
												variant={severityMap[incident.severity].variant}
												class={severityMap[incident.severity].class}
											>
												{severityMap[incident.severity].label}
											</Badge>
										</Table.Cell>
										<Table.Cell>{incident.reporterName || '-'}</Table.Cell>
										<Table.Cell>
											{#if incident.capa}
												<Badge variant="secondary" class="font-normal">
													{incident.capa}
												</Badge>
											{:else}
												<span class="text-xs text-muted-foreground italic">Belum ada</span>
											{/if}
										</Table.Cell>
										<Table.Cell>
											<div
												class={cn(
													'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none',
													incidentStatusMap[incident.status].class
												)}
											>
												{incidentStatusMap[incident.status].label}
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={7} class="h-24 text-center">
											Tidak ada laporan insiden.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="limbah" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Log Pembuangan Limbah</Card.Title>
					<Card.Description>Monitoring volume dan status pembuangan limbah B3</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>ID</Table.Head>
									<Table.Head>Jenis Limbah</Table.Head>
									<Table.Head>Berat (g)</Table.Head>
									<Table.Head>Laboratorium</Table.Head>
									<Table.Head>PIC</Table.Head>
									<Table.Head>Status Pembuangan</Table.Head>
									<Table.Head>Tanggal</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each wasteLogs as log (log.id)}
									<Table.Row>
										<Table.Cell class="font-mono text-xs text-muted-foreground">
											{log.id.slice(0, 8)}
										</Table.Cell>
										<Table.Cell>
											<Badge
												variant="outline"
												class={cn('font-medium', wasteTypeMap[log.wasteType].class)}
											>
												{wasteTypeMap[log.wasteType].label}
											</Badge>
										</Table.Cell>
										<Table.Cell class="font-medium">{log.weightGram}</Table.Cell>
										<Table.Cell>{log.laboratorium?.name || '-'}</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<div class="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
													<User class="h-3 w-3 text-muted-foreground" />
												</div>
												<span class="text-sm">{log.pic?.name || 'Anonim'}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div
												class={cn(
													'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
													disposalStatusMap[log.disposalStatus || 'STORED'].class
												)}
											>
												{disposalStatusMap[log.disposalStatus || 'STORED'].label}
											</div>
										</Table.Cell>
										<Table.Cell>{formatDate(log.createdAt)}</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={7} class="h-24 text-center">
											Tidak ada log pembuangan limbah.
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>
