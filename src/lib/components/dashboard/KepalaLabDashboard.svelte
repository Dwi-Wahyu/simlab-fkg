<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import type { KepalaLabDashboardData } from '$lib/types/dashboard';

	let { data }: { data: KepalaLabDashboardData } = $props();

	const inventoryItems = $derived([
		{ label: 'Total Alat', value: data.inventorySummary.totalEquipment, color: '' },
		{ label: 'Kondisi Baik', value: data.inventorySummary.baik, color: 'text-green-600' },
		{ label: 'Rusak Ringan', value: data.inventorySummary.rusakRingan, color: 'text-yellow-600' },
		{ label: 'Rusak Berat', value: data.inventorySummary.rusakBerat, color: 'text-red-600' },
		{ label: 'Sedang Dipakai', value: data.inventorySummary.inUse, color: 'text-blue-600' },
		{ label: 'Pemeliharaan', value: data.inventorySummary.maintenance, color: 'text-orange-600' }
	]);
</script>

<div class="space-y-6">
	<div>
		<h2 class="mb-1 text-lg font-semibold">{data.laboratoriumName}</h2>
		<p class="text-sm text-muted-foreground">Dashboard Kepala Laboratorium</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-6">
		{#each inventoryItems as item}
			<Card.Root>
				<Card.Content>
					<p class="mb-1 text-xs leading-tight text-muted-foreground">{item.label}</p>
					<p class="text-xl font-bold {item.color}">{item.value}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Peminjaman Menunggu Persetujuan</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if data.pendingLendingApprovals.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Tidak ada yang menunggu</p>
				{:else}
					<div class="space-y-3">
						{#each data.pendingLendingApprovals as lending}
							<a
								href="/admin/peminjaman/{lending.id}"
								class="block rounded border p-2 transition-colors hover:bg-muted/50"
							>
								<p class="text-sm font-medium">{lending.requesterName}</p>
								<p class="text-xs text-muted-foreground capitalize">
									{lending.purpose.toLowerCase().replace(/_/g, ' ')}
								</p>
							</a>
						{/each}
					</div>
				{/if}
			</Card.Content>
			{#if data.pendingLendingApprovals.length !== 0}
				<Card.Footer>
					<Button href="/admin/peminjaman" variant="link">Lihat Semua</Button>
				</Card.Footer>
			{/if}
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Laporan Inventaris</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if data.latestInventoryReport}
					<div class="space-y-2 rounded border p-3">
						<div class="flex items-center justify-between">
							<span class="text-sm">Status Laporan</span>
							<Badge
								variant={data.latestInventoryReport.status === 'SUBMITTED_TO_SPMI'
									? 'default'
									: 'secondary'}
							>
								{data.latestInventoryReport.status.replace(/_/g, ' ')}
							</Badge>
						</div>
						<p class="text-xs text-muted-foreground">
							{new Date(data.latestInventoryReport.createdAt).toLocaleDateString('id-ID', {
								dateStyle: 'long'
							})}
						</p>
					</div>
				{:else}
					<p class="py-4 text-center text-sm text-muted-foreground">Belum ada laporan</p>
				{/if}
				<!-- <Button href="/admin/laporan/btk16" class="mt-3 w-full" variant="outline" size="sm">
					Buat Laporan
				</Button> -->
			</Card.Content>
		</Card.Root>
	</div>
</div>
