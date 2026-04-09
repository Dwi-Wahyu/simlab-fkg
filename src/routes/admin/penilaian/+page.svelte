<script lang="ts">
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Calendar, Clock, MapPin, Users, ClipboardCheck } from '@lucide/svelte';
	import { badgeVariants } from '$lib/components/ui/badge';

	let { data } = $props();

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(date));
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Penilaian Praktikum</h1>
			<p class="text-muted-foreground">
				Catat nilai mahasiswa untuk setiap modul praktikum yang Anda ampu.
			</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Jadwal Amputan Anda</Card.Title>
			<Card.Description>
				Terdapat {data.schedules.length} jadwal kegiatan yang memerlukan penilaian.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Kegiatan</Table.Head>
						<Table.Head>Waktu & Lokasi</Table.Head>
						<Table.Head>Peserta</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.schedules as schedule (schedule.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									<span class="font-bold">{schedule.title}</span>
									<div class="flex gap-2">
										<span class={badgeVariants({ variant: 'secondary' })}>{schedule.type}</span>
										<span class={badgeVariants({ variant: 'outline' })}>Kelas {schedule.class}</span
										>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1 text-sm">
									<div class="flex items-center gap-1.5">
										<Calendar class="h-3.5 w-3.5 text-muted-foreground" />
										{new Date(schedule.startTime).toLocaleDateString('id-ID', {
											weekday: 'short',
											day: 'numeric',
											month: 'short'
										})}
									</div>
									<div class="flex items-center gap-1.5">
										<Clock class="h-3.5 w-3.5 text-muted-foreground" />
										{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
									</div>
									<div class="flex items-center gap-1.5">
										<MapPin class="h-3.5 w-3.5 text-muted-foreground" />
										{schedule.laboratorium.name}
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1.5">
									<Users class="h-3.5 w-3.5 text-muted-foreground" />
									{schedule.participantCount} orang
								</div>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button href="{base}/admin/penilaian/{schedule.id}" size="sm">
									<ClipboardCheck class="mr-2 h-4 w-4" />
									Catat Nilai
								</Button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={4} class="h-24 text-center">
								Belum ada jadwal kegiatan yang ditugaskan kepada Anda.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
