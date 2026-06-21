<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CalendarDays, ClipboardCheck, BookOpen } from '@lucide/svelte';
	import type { InstrukturDashboardData } from '$lib/types/dashboard';

	let { data }: { data: InstrukturDashboardData } = $props();
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
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
		<Card.Root>
			<Card.Content>
				<div class="mb-1 flex items-center gap-2 text-muted-foreground">
					<BookOpen class="h-4 w-4" />
					<span class="text-sm">Logbook Saya</span>
				</div>
				<p class="text-2xl font-bold">{data.myRecentLogbooks.length}</p>
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
					<div class="space-y-2">
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
