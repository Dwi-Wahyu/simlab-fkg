<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Package, BookOpen, History } from '@lucide/svelte';
	import type { PenelitiDashboardData } from '$lib/types/dashboard';

	let { data }: { data: PenelitiDashboardData } = $props();

	const statusColor = (status: string) => {
		if (status === 'DIPINJAM') return 'bg-blue-100 text-blue-800';
		if (status === 'APPROVED') return 'bg-green-100 text-green-800';
		if (status === 'DRAFT') return 'bg-gray-100 text-gray-800';
		return 'bg-yellow-100 text-yellow-800';
	};
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<Package class="h-4 w-4" />
					<span class="text-sm">Peminjaman Aktif</span>
				</div>
				<p class="text-2xl font-bold">{data.activeLendings.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<History class="h-4 w-4" />
					<span class="text-sm">Dipinjam Bulan Ini</span>
				</div>
				<p class="text-2xl font-bold">{data.totalBorrowedThisMonth}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<BookOpen class="h-4 w-4" />
					<span class="text-sm">Logbook Saya</span>
				</div>
				<p class="text-2xl font-bold">{data.myLogbooks.length}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Peminjaman Saya</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				{#if data.activeLendings.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Tidak ada peminjaman aktif</p>
				{:else}
					<div>
						{#each data.activeLendings as lending}
							<div class="flex items-center gap-3 rounded border p-2">
								<Package class="h-4 w-4 shrink-0 text-muted-foreground" />
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{lending.equipmentName}</p>
									{#if lending.dueDate}
										<p class="text-xs text-muted-foreground">
											Kembali: {new Date(lending.dueDate).toLocaleDateString('id-ID', {
												dateStyle: 'medium'
											})}
										</p>
									{/if}
								</div>
								<span class="rounded-full px-2 py-0.5 text-xs {statusColor(lending.status)}"
									>{lending.status}</span
								>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Logbook Saya</Card.Title>
				<Button href="/admin/logbook-saya" variant="link" size="xs">Lihat Semua</Button>
			</Card.Header>
			<Card.Content>
				{#if data.myLogbooks.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Belum ada logbook</p>
				{:else}
					<div class="space-y-2">
						{#each data.myLogbooks as lb}
							<a
								href="/admin/logbook-saya/{lb.id}"
								class="block rounded border p-2 transition-colors hover:bg-muted/50"
							>
								<p class="text-sm font-medium">{lb.seriesName}</p>
								{#if lb.lastUpdated}
									<p class="text-xs text-muted-foreground">
										{new Date(lb.lastUpdated).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
									</p>
								{/if}
							</a>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
