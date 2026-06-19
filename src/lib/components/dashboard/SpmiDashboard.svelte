<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { FileText, ShieldCheck, AlertOctagon, Gauge } from '@lucide/svelte';
	import type { SpmiDashboardData } from '$lib/types/dashboard';

	let { data }: { data: SpmiDashboardData } = $props();

	const severityBadge = (s: string) =>
		s === 'HIGH' ? 'destructive' : s === 'MEDIUM' ? 'secondary' : 'outline';
	const reportStatusColor = (s: string) =>
		s === 'SUBMITTED_TO_SPMI' ? 'default' : s === 'SIGNED_BY_KEPALA_LAB' ? 'secondary' : 'outline';
</script>

<div class="space-y-6">
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<FileText class="h-4 w-4" />
					<span class="text-sm">Laporan Masuk</span>
				</div>
				<p class="text-2xl font-bold">{data.latestInventoryReports.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<ShieldCheck class="h-4 w-4" />
					<span class="text-sm">Audit Checklist</span>
				</div>
				<p class="text-2xl font-bold">{data.auditChecklists.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<AlertOctagon class="h-4 w-4" />
					<Card.Title class="text-sm">Insiden K3</Card.Title>
				</div>
				<p class="text-2xl font-bold text-red-600">{data.safetyIncidents.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<Gauge class="h-4 w-4" />
					<span class="text-sm">Kepatuhan Kalibrasi</span>
				</div>
				<p class="text-2xl font-bold">{data.calibrationCompliance.percentage}%</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Kalibrasi progress bar -->
	<Card.Root>
		<Card.Header class="pb-2">
			<Card.Title class="text-base">Tingkat Kepatuhan Kalibrasi</Card.Title>
		</Card.Header>
		<Card.Content>
			<Progress value={data.calibrationCompliance.percentage} class="h-3" />
			<p class="mt-1 text-xs text-muted-foreground">
				{data.calibrationCompliance.calibrated} dari {data.calibrationCompliance.total} alat sudah dikalibrasi
			</p>
		</Card.Content>
	</Card.Root>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="border-b">
				<Card.Title class="text-base">Laporan Inventaris</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				{#each data.latestInventoryReports as r}
					<div class="space-y-0.5 rounded border p-2">
						<div class="flex items-center justify-between gap-2">
							<p class="truncate text-sm">{r.laboratoriumName}</p>
							<Badge variant={reportStatusColor(r.status)} class="shrink-0 text-xs">
								{r.status === 'SUBMITTED_TO_SPMI'
									? 'Masuk'
									: r.status === 'SIGNED_BY_KEPALA_LAB'
										? 'Ditanda Tangani'
										: 'Draft'}
							</Badge>
						</div>
						<p class="text-xs text-muted-foreground">
							{new Date(r.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
						</p>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="border-b"
				><Card.Title class="text-base">Insiden K3</Card.Title></Card.Header
			>
			<Card.Content class="space-y-2">
				{#if data.safetyIncidents.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Tidak ada insiden 🎉</p>
				{:else}
					{#each data.safetyIncidents as inc}
						<div class="space-y-0.5 rounded border p-2">
							<div class="flex items-center justify-between gap-2">
								<p class="truncate text-sm">{inc.laboratoriumName}</p>
								<Badge variant={severityBadge(inc.severity)} class="shrink-0 text-xs"
									>{inc.severity}</Badge
								>
							</div>
							<p class="text-xs text-muted-foreground">
								{new Date(inc.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
							</p>
						</div>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="border-b"
				><Card.Title class="text-base">Audit Checklist</Card.Title></Card.Header
			>
			<Card.Content class="space-y-2">
				{#each data.auditChecklists as c}
					<div class="space-y-1 rounded border p-2">
						<p class="text-sm">{c.laboratoriumName}</p>
						<Progress value={c.completionRate} class="h-1.5" />
						<p class="text-xs text-muted-foreground">{c.completionRate}% selesai</p>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
