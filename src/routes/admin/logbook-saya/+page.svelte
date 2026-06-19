<script lang="ts">
	import { BookOpen, ArrowRight, Calendar, Award, FlaskConical } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { badgeVariants } from '$lib/components/ui/badge';

	let { data } = $props();

	function formatDate(d: Date | null) {
		if (!d) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(d));
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Logbook Saya</h1>
			<p class="text-muted-foreground">Generate dan unduh logbook praktikum per seri kegiatan.</p>
		</div>
	</div>

	{#if data.series.length === 0}
		<Card.Root class="flex flex-col items-center gap-4 py-16">
			<BookOpen class="h-12 w-12 text-muted-foreground" />
			<p class="text-muted-foreground">Belum ada data praktikum yang tersedia.</p>
		</Card.Root>
	{:else}
		<Card.Root class="overflow-hidden p-0">
			<Card.Content class="p-0">
				<Table.Root class="block md:table">
					<Table.Header class="hidden md:table-header-group">
						<Table.Row>
							<Table.Head>Seri Praktikum</Table.Head>
							<Table.Head>Laboratorium</Table.Head>
							<Table.Head>Jadwal Dinilai</Table.Head>
							<Table.Head>Rata-rata Nilai</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="block md:table-row-group">
						{#each data.series as series (series.id)}
							<Table.Row class="flex flex-col border-b last:border-0 md:table-row">
								<Table.Cell class="p-4">
									<div class="flex flex-col gap-1">
										<span class="font-semibold">{series.name}</span>
										<span class={badgeVariants({ variant: 'outline' })}>{series.blockName}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="p-4">
									<div class="flex items-center gap-2">
										<FlaskConical class="h-4 w-4 text-muted-foreground" />
										<span class="text-sm">{series.laboratoriumName}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="p-4">
									<div class="flex items-center gap-2">
										<Calendar class="h-4 w-4 text-muted-foreground" />
										<span class="text-sm"
											>{series.totalAssessed} / {series.totalSchedules} jadwal</span
										>
									</div>
								</Table.Cell>
								<Table.Cell class="p-4">
									<div class="flex items-center gap-2">
										<Award class="h-4 w-4 text-muted-foreground" />
										<span class="text-sm font-medium">{series.avgScore}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="p-4 text-right">
									<Button size="sm" href="/admin/logbook-saya/{series.id}">Lihat Detail</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
