<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Wrench, Gauge, AlertTriangle, CheckCircle } from '@lucide/svelte';
	import type { TeknisiDashboardData } from '$lib/types/dashboard';

	let { data }: { data: TeknisiDashboardData } = $props();

	const statusBadge = (status: string) => {
		if (status === 'IN_PROGRESS') return 'default';
		if (status === 'PENDING') return 'secondary';
		return 'outline';
	};
	const conditionColor = (c: string) => (c === 'RUSAK_BERAT' ? 'text-red-600' : 'text-yellow-600');
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<Wrench class="h-4 w-4" />
					<span class="text-sm">Pemeliharaan Aktif</span>
				</div>
				<p class="text-2xl font-bold text-orange-600">{data.pendingMaintenance.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<Gauge class="h-4 w-4" />
					<span class="text-sm">Kalibrasi Mendatang</span>
				</div>
				<p class="text-2xl font-bold text-blue-600">{data.upcomingCalibrations.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<CheckCircle class="h-4 w-4" />
					<span class="text-sm">Selesai Bulan Ini</span>
				</div>
				<p class="text-2xl font-bold text-green-600">{data.completedThisMonth}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title class="text-base">Pemeliharaan & Kalibrasi</Card.Title>
				<Button href="/admin/pemeliharaan" variant="link" size="xs">Lihat Semua</Button>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each data.pendingMaintenance as m}
						<a
							href="/admin/pemeliharaan/{m.id}/edit"
							class="block rounded border p-2 transition-colors hover:bg-muted/50"
						>
							<div class="flex items-start justify-between gap-2">
								<p class="truncate text-sm font-medium">{m.equipmentName}</p>
								<Badge variant={statusBadge(m.status)} class="shrink-0 text-xs">{m.status}</Badge>
							</div>
							<div class="mt-0.5 flex items-center gap-2">
								<span class="text-xs text-muted-foreground">{m.maintenanceType}</span>
								{#if m.scheduledDate}
									<span class="text-xs text-muted-foreground"
										>·
										{new Date(m.scheduledDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
									</span>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title class="text-base">Alat Perlu Perhatian</Card.Title>
				<Button href="/admin/inventaris/alat" variant="link" size="xs">Lihat</Button>
			</Card.Header>
			<Card.Content>
				{#if data.equipmentNeedingAttention.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">
						Semua alat dalam kondisi baik
					</p>
				{:else}
					<div class="space-y-2">
						{#each data.equipmentNeedingAttention as eq}
							<div class="flex items-center gap-3 rounded border p-2">
								<AlertTriangle class="h-4 w-4 {conditionColor(eq.condition)} shrink-0" />
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{eq.name}</p>
									{#if eq.serialNumber}<p class="text-xs text-muted-foreground">
											{eq.serialNumber}
										</p>{/if}
								</div>
								<Badge
									variant={eq.condition === 'RUSAK_BERAT' ? 'destructive' : 'secondary'}
									class="shrink-0 text-xs"
								>
									{eq.condition.replace(/_/g, ' ')}
								</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
