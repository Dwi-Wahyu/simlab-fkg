<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { LaboranDashboardData } from '$lib/types/dashboard';

	let { data }: { data: LaboranDashboardData } = $props();

	const inventoryItems = $derived([
		{
			label: 'Total Alat',
			value: data.inventorySummary.totalEquipment,
			color: ''
		},
		{
			label: 'Kondisi Baik',
			value: data.inventorySummary.baik,
			color: 'text-green-600'
		},
		{
			label: 'Kondisi Rusak',
			value: data.inventorySummary.rusak,
			color: 'text-red-600'
		},
		{
			label: 'Sedang Dipakai',
			value: data.inventorySummary.inUse,
			color: 'text-blue-600'
		},
		{
			label: 'Pemeliharaan',
			value: data.inventorySummary.maintenance,
			color: 'text-orange-600'
		}
	]);
</script>

<div class="space-y-6">
	<div>
		<h2 class="mb-1 text-lg font-semibold">{data.laboratoriumName}</h2>
		<p class="text-sm text-muted-foreground">Dashboard Laboran</p>
	</div>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
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
			<Card.Header>
				<Card.Title>Laporan Inventaris Terkini</Card.Title>
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
							Dibuat pada: {new Date(data.latestInventoryReport.createdAt).toLocaleDateString(
								'id-ID',
								{
									dateStyle: 'long'
								}
							)}
						</p>
					</div>
				{:else}
					<p class="py-4 text-center text-sm text-muted-foreground">Belum ada laporan inventaris</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Menu Cepat</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				<Button href="/admin/inventaris/alat" variant="outline" class="justify-start">
					Kelola Alat
				</Button>
				<Button href="/admin/inventaris/bhp" variant="outline" class="justify-start">
					Stokis Bahan Habis Pakai
				</Button>
				<!-- <Button href="/admin/laporan" variant="outline" class="justify-start">
					Laporan Inventaris
				</Button> -->
			</Card.Content>
		</Card.Root>
	</div>
</div>
