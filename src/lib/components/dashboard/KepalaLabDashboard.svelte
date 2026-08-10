<script lang="ts">
	import { AlertTriangle } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { KepalaLabDashboardData } from '$lib/types/dashboard';

	let { data }: { data: KepalaLabDashboardData } = $props();

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
			label: 'Dipinjam',
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
		<p class="text-sm text-muted-foreground">Dashboard Kepala Laboratorium</p>
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
					>Daftar peminjaman alat yang jatuh tempo segera (H-1 / Hari Ini) atau telah terlambat
					dikembalikan.</Card.Description
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
												class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
											>
												H-1 Kembali
											</span>
										{/if}
									</td>
									<td class="px-4 py-3.5 text-right">
										<Button variant="outline" size="xs" href="/admin/peminjaman/{alert.id}">
											Detail
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
				<Card.Title>Pemeliharaan Menunggu Review</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col items-center justify-center py-6">
				<span
					class="text-4xl font-extrabold {data.pendingMaintenanceApprovals > 0
						? 'text-amber-600'
						: 'text-slate-400'}"
				>
					{data.pendingMaintenanceApprovals}
				</span>
				<p class="mt-2 text-xs text-muted-foreground">Pekerjaan selesai menunggu verifikasi</p>
			</Card.Content>
			{#if data.pendingMaintenanceApprovals > 0}
				<Card.Footer>
					<Button href="/admin/pemeliharaan/approval" variant="link" class="w-full text-center"
						>Tinjau Nota</Button
					>
				</Card.Footer>
			{/if}
		</Card.Root>

		<!-- <Card.Root>
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
				
			</Card.Content>
		</Card.Root> -->
	</div>
</div>
