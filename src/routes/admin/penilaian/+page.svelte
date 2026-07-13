<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as Accordion from '$lib/components/ui/accordion';
	import {
		Calendar,
		Clock,
		MapPin,
		Users,
		ClipboardCheck,
		FileText,
		ChevronDown,
		ChevronUp,
		Search,
		FlaskConical
	} from '@lucide/svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import Input from '@/components/ui/input/input.svelte';

	let { data } = $props();

	let expandedSchedules = $state<Record<string, boolean>>({});

	function toggleExpand(id: string) {
		expandedSchedules[id] = !expandedSchedules[id];
	}

	let filter = $state('');
	let debouncedFilter = $state('');
	let filterTimeout: ReturnType<typeof setTimeout>;
	let labFilter = $state('all');

	// Flatten schedules to find unique labs
	const allSchedules = $derived(data.groups.flatMap((g) => g.schedules));
	let uniqueLabs = $derived([
		...new Map(allSchedules.map((s) => [s.laboratorium.id, s.laboratorium])).values()
	]);

	function onFilterInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		filter = value;
		clearTimeout(filterTimeout);
		filterTimeout = setTimeout(() => {
			debouncedFilter = value;
		}, 300);
	}

	// Filter schedules inside groups, keeping only groups that have matching schedules
	let filteredGroups = $derived(
		data.groups
			.map((group) => {
				const matchingSchedules = group.schedules.filter((s) => {
					const matchesSearch =
						!debouncedFilter || s.title.toLowerCase().includes(debouncedFilter.toLowerCase());
					const matchesLab = labFilter === 'all' || s.laboratorium.id === labFilter;
					return matchesSearch && matchesLab;
				});
				return {
					...group,
					schedules: matchingSchedules
				};
			})
			.filter((group) => group.schedules.length > 0)
	);

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
				Terdapat {allSchedules.length} jadwal kegiatan praktikum.
			</p>
		</div>
	</div>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="relative flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

			<Input
				type="text"
				placeholder="Cari nama kegiatan..."
				bind:value={filter}
				oninput={onFilterInput}
				class="w-full pl-10"
			/>
		</div>

		<Select.Root type="single" bind:value={labFilter}>
			<Select.Trigger class="w-full sm:w-55">
				<FlaskConical class="mr-2 size-4 text-muted-foreground" />
				{labFilter === 'all'
					? 'Semua Laboratorium'
					: (uniqueLabs.find((l) => l.id === labFilter)?.name ?? 'Semua Laboratorium')}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all" label="Semua Laboratorium">Semua Laboratorium</Select.Item>
				{#each uniqueLabs as lab (lab.id)}
					<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<Accordion.Root type="multiple" class="w-full space-y-4">
		{#each filteredGroups as group (group.key)}
			<Accordion.Item value={group.key} class="rounded-xl border bg-white px-6 py-1 shadow-sm">
				<Accordion.Trigger class="py-4 hover:no-underline">
					<div class="flex flex-col items-start gap-1 text-left">
						{#if group.subLabel}
							<span class="text-xs font-semibold tracking-wider text-primary uppercase"
								>{group.subLabel}</span
							>
						{/if}
						<h3 class="text-lg font-bold text-slate-900">{group.label}</h3>
						<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
							<span>{group.schedules.length} Jadwal</span>
							<span>•</span>
							<span
								>Progress: <strong class="text-slate-700"
									>{group.assessedCount}/{group.totalCount}</strong
								> dinilai</span
							>
						</div>
					</div>
				</Accordion.Trigger>
				<Accordion.Content class="pt-2 pb-4">
					<div class="mt-2 overflow-hidden rounded-lg border bg-white shadow-sm">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head>Kegiatan</Table.Head>
									<Table.Head>Waktu & Lokasi</Table.Head>
									<Table.Head>Peserta</Table.Head>
									<Table.Head class="text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#each group.schedules as schedule (schedule.id)}
									<Table.Row class="flex flex-col border-b last:border-0 md:table-row md:border-b">
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:p-4"
											onclick={() => toggleExpand(schedule.id)}
										>
											<div class="flex flex-col gap-1">
												<span class="text-base font-bold md:text-sm">{schedule.title}</span>
												<div class="flex flex-wrap gap-2">
													<span class={badgeVariants({ variant: 'outline' })}
														>Kelas {schedule.class}</span
													>
												</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="ml-4 h-8 w-8 shrink-0 md:hidden"
												aria-label="Expand row"
											>
												{#if expandedSchedules[schedule.id]}
													<ChevronUp class="h-4 w-4" />
												{:else}
													<ChevronDown class="h-4 w-4" />
												{/if}
											</Button>
										</Table.Cell>

										<Table.Cell
											class="{expandedSchedules[schedule.id]
												? 'block'
												: 'hidden'} border-b-0 p-4 pt-0 pb-2 whitespace-normal md:table-cell md:border-b md:p-4"
										>
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

										<Table.Cell
											class="{expandedSchedules[schedule.id]
												? 'block'
												: 'hidden'} border-b-0 p-4 pt-0 pb-2 whitespace-normal md:table-cell md:border-b md:p-4"
										>
											<div class="flex items-center gap-1.5 text-sm">
												<Users class="h-3.5 w-3.5 text-muted-foreground" />
												{schedule.participantCount} orang
											</div>
										</Table.Cell>

										<Table.Cell
											class="{expandedSchedules[schedule.id]
												? 'block'
												: 'hidden'} border-b-0 p-4 pt-2 pb-4 text-left md:table-cell md:border-b md:p-4 md:text-right"
										>
											{#if data.isCoordinatorView}
												<Button
													href="/admin/penilaian/{schedule.id}/rekapitulasi"
													size="sm"
													class="w-full md:w-auto"
												>
													<FileText class="mr-2 h-4 w-4" />
													Lihat Rekapitulasi
												</Button>
											{:else}
												<Button
													href="/admin/penilaian/{schedule.id}"
													size="sm"
													class="w-full md:w-auto"
												>
													<ClipboardCheck />
													Catat Nilai
												</Button>
											{/if}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Accordion.Content>
			</Accordion.Item>
		{:else}
			<div class="py-12 text-center text-muted-foreground border rounded-xl bg-white shadow-sm">
				Tidak ada jadwal kegiatan praktikum ditemukan.
			</div>
		{/each}
	</Accordion.Root>
</div>
