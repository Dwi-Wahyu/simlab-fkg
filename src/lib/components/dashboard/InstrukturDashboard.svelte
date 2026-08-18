<script lang="ts">
	import {
		AlertTriangle,
		ArrowRight,
		BookOpen,
		CalendarDays,
		ClipboardCheck
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { InstrukturDashboardData } from '$lib/types/dashboard';
	import { cn } from '$lib/utils';
	import { formatLendingPurpose } from '$lib/utils/peminjaman';

	let { data }: { data: InstrukturDashboardData } = $props();
</script>

<div class="space-y-6">
	{#if data.returnAlerts && data.returnAlerts.length > 0}
		<div class="space-y-3">
			{#each data.returnAlerts as alert}
				{@const isOverdue = alert.dueDate ? new Date(alert.dueDate) < new Date() : false}
				<div
					class={cn(
						'flex flex-col gap-3 rounded-lg border p-4 shadow-sm md:flex-row md:items-center md:justify-between',
						isOverdue
							? 'border-red-200 bg-red-50 text-red-900'
							: 'border-amber-200 bg-amber-50 text-amber-900'
					)}
				>
					<div class="flex items-start gap-3">
						<AlertTriangle
							class={cn('mt-0.5 size-5 shrink-0', isOverdue ? 'text-red-600' : 'text-amber-600')}
						/>
						<div>
							<h4 class="text-sm font-semibold">
								{isOverdue ? 'Peminjaman Alat Terlambat!' : 'Pengingat Pengembalian Alat'}
							</h4>
							<p class="mt-0.5 text-xs opacity-90">
								{#if isOverdue}
									Masa peminjaman alat telah melewati batas waktu pengembalian.
								{:else}
									Masa peminjaman alat akan segera berakhir.
								{/if}
								Tujuan: <span class="font-medium">{formatLendingPurpose(alert.purpose)}</span>
								({alert.unit || '-'}). Alat:
								<span class="font-medium"
									>{alert.items.map((i) => `${i.name} (${i.qty} pcs)`).join(', ')}</span
								>. Jatuh tempo:
								<span class="font-semibold"
									>{alert.dueDate
										? new Date(alert.dueDate).toLocaleDateString('id-ID', {
												dateStyle: 'medium',
												timeStyle: 'short'
											})
										: '-'}</span
								>.
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						href="/admin/peminjaman/{alert.id}"
						class={cn(
							'w-full shrink-0 gap-1 border-current bg-transparent hover:bg-white md:w-auto',
							isOverdue ? 'text-red-900 hover:text-red-900' : 'text-amber-900 hover:text-amber-900'
						)}
					>
						Kembalikan Sekarang
						<ArrowRight class="size-4" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<CalendarDays class="h-4 w-4" />
					<span class="text-sm">Jadwal Bulan Ini</span>
				</div>
				<p class="text-2xl font-bold">{data.totalSchedulesThisMonth}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<ClipboardCheck class="h-4 w-4" />
					<span class="text-sm">Penilaian Pending</span>
				</div>
				<p class="text-2xl font-bold text-orange-600">{data.pendingAssessments.length}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Jadwal Mendatang</Card.Title>
				<Button href="/admin/jadwal-praktikum" variant="link" size="xs">Lihat Semua</Button>
			</Card.Header>
			<Card.Content>
				{#if data.upcomingSchedules.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Tidak ada jadwal mendatang</p>
				{:else}
					<div class="space-y-3">
						{#each data.upcomingSchedules as sched}
							<div class="flex items-start gap-3">
								<div class="shrink-0 rounded-md bg-primary/10 p-2 text-primary">
									<CalendarDays class="h-4 w-4" />
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{sched.name}</p>
									<p class="text-xs text-muted-foreground">{sched.laboratoriumName}</p>
									{#if sched.startTime}
										<p class="text-xs text-muted-foreground">
											{new Date(sched.startTime).toLocaleDateString('id-ID', {
												weekday: 'short',
												day: '2-digit',
												month: 'short'
											})}
										</p>
									{/if}
								</div>
								<Badge variant="outline" class="ml-auto shrink-0 text-xs">{sched.type}</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<Card.Title>Penilaian Perlu Diisi</Card.Title>
				<Button href="/admin/penilaian" variant="link" size="xs">Lihat</Button>
			</Card.Header>
			<Card.Content>
				{#if data.pendingAssessments.length === 0}
					<p class="py-4 text-center text-sm text-muted-foreground">Semua penilaian selesai</p>
				{:else}
					<div class="space-y-3">
						{#each data.pendingAssessments as assessment}
							<a
								href="/admin/penilaian/{assessment.id}"
								class="flex items-center justify-between rounded border p-2 transition-colors hover:bg-muted/50"
							>
								<span class="truncate text-sm">{assessment.scheduleName}</span>
								<Badge variant="destructive" class="ml-2 shrink-0 text-xs"
									>{assessment.studentCount} mhs</Badge
								>
							</a>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
