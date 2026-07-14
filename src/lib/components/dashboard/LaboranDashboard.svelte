<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { LaboranDashboardData } from '$lib/types/dashboard';
	import { AlertTriangle } from '@lucide/svelte';

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

	{#if data.returnAlerts && data.returnAlerts.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-red-700">
					<AlertTriangle class="size-5 text-red-600" />
					Peringatan Pengembalian Alat
				</Card.Title>
				<Card.Description
					>Daftar peminjaman alat yang jatuh tempo besok atau sudah terlambat dikembalikan.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<div class="overflow-x-auto rounded-lg border">
					<table class="w-full text-left text-xs">
						<thead class="bg-slate-50 font-semibold text-slate-700 uppercase">
							<tr>
								<th class="px-4 py-3">Nama Peminjam</th>
								<th class="px-4 py-3">Daftar Alat</th>
								<th class="px-4 py-3">Tanggal Jatuh Tempo</th>
								<th class="px-4 py-3 text-center">Status</th>
								<th class="px-4 py-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100 bg-white text-slate-600">
							{#each data.returnAlerts as alert}
								{@const isOverdue = alert.dueDate ? new Date(alert.dueDate) < new Date() : false}
								<tr class="hover:bg-slate-50/50">
									<td class="px-4 py-3.5 font-medium text-slate-900">{alert.borrowerName}</td>
									<td class="px-4 py-3.5 whitespace-normal">
										<div class="flex flex-wrap gap-1">
											{#each alert.items as item}
												<Badge variant="outline" class="text-[10px]"
													>{item.name} ({item.qty} pcs)</Badge
												>
											{/each}
										</div>
									</td>
									<td class="px-4 py-3.5">
										{alert.dueDate
											? new Date(alert.dueDate).toLocaleDateString('id-ID', {
													dateStyle: 'medium',
													timeStyle: 'short'
												})
											: '-'}
									</td>
									<td class="px-4 py-3.5 text-center">
										{#if isOverdue}
											<span
												class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800"
											>
												Terlambat
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800"
											>
												H-1 Kembali
											</span>
										{/if}
									</td>
									<td class="px-4 py-3.5 text-right">
										<Button
											variant="outline"
											size="xs"
											href="/admin/peminjaman/{alert.id}"
											class="border-[#006a34] text-[#006a34] hover:bg-[#006a34]/10"
										>
											Proses Pengembalian
										</Button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

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
