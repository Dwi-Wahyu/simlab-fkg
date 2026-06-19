<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CalendarDays, ClipboardList, Wrench, AlertTriangle, Trash2 } from '@lucide/svelte';
	import type { KoordinatorDashboardData } from '$lib/types/dashboard';

	let { data }: { data: KoordinatorDashboardData } = $props();
</script>

<div class="space-y-6">
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<ClipboardList class="h-4 w-4" />
					<span class="text-sm">Peminjaman Aktif</span>
				</div>
				<p class="text-2xl font-bold">{data.activeLendings}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<AlertTriangle class="h-4 w-4" />
					<span class="text-sm">Perlu Persetujuan</span>
				</div>
				<p class="text-2xl font-bold text-orange-600">{data.pendingApprovals}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<Wrench class="h-4 w-4" />
					<span class="text-sm">Alert Pemeliharaan</span>
				</div>
				<p class="text-2xl font-bold text-yellow-600">{data.maintenanceAlerts}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<Trash2 class="h-4 w-4" />
					<span class="text-sm">Limbah Bulan Ini</span>
				</div>
				<p class="text-2xl font-bold">{data.recentWasteLogs}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<Card.Title class="text-base">Jadwal Praktikum Hari Ini</Card.Title>
			<Button href="/admin/jadwal-praktikum" variant="link" size="xs">Lihat Semua</Button>
		</Card.Header>
		<Card.Content>
			{#if data.todaySchedules.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">Tidak ada jadwal hari ini</p>
			{:else}
				<div class="space-y-3">
					{#each data.todaySchedules as sched}
						<div class="flex items-center gap-3 rounded border p-2">
							<CalendarDays class="h-4 w-4 shrink-0 text-muted-foreground" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{sched.name}</p>
								<p class="text-xs text-muted-foreground">{sched.laboratoriumName}</p>
							</div>
							<Badge variant="outline" class="shrink-0 text-xs">{sched.type}</Badge>
							{#if sched.startTime}
								<span class="shrink-0 text-xs text-muted-foreground">
									{new Date(sched.startTime).toLocaleTimeString('id-ID', {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
