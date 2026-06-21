<script lang="ts">
	import { BookOpen, ChevronLeft, ChevronRight, ClipboardEdit, Clock, Users } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data } = $props();

	let viewMode = $state<'month' | 'day'>('month');
	let currentDate = $state(new Date());

	// Filter state (non-instruktur only)
	let selectedSeriesIds = $state<string[]>([]);
	let selectedInstructorIds = $state<string[]>([]);

	// Detail popup
	let selectedSchedule = $state<(typeof data.schedules)[0] | null>(null);
	let isDetailOpen = $state(false);

	// Filtered schedules
	const filteredSchedules = $derived(
		data.schedules.filter((schedule: any) => {
			if (selectedSeriesIds.length > 0 && schedule.seriesId) {
				if (!selectedSeriesIds.includes(schedule.seriesId)) return false;
			}
			if (selectedInstructorIds.length > 0) {
				const instrIds = schedule.instructors.map((i: any) => i.instructorId);
				if (!instrIds.some((id: string) => selectedInstructorIds.includes(id))) return false;
			}
			return true;
		})
	);

	// Calendar days computation
	const calendarDays = $derived.by(() => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const days: { date: Date; isCurrentMonth: boolean }[] = [];

		const startPadding = firstDay.getDay();
		for (let i = startPadding - 1; i >= 0; i--) {
			days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
		}

		for (let d = 1; d <= lastDay.getDate(); d++) {
			days.push({ date: new Date(year, month, d), isCurrentMonth: true });
		}

		const endPadding = 42 - days.length;
		for (let i = 1; i <= endPadding; i++) {
			days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
		}

		return days;
	});

	function getSchedulesForDate(date: Date) {
		return filteredSchedules.filter((s: any) => {
			const start = new Date(s.startTime);
			return isSameDay(start, date);
		});
	}

	function getSchedulesForHour(date: Date, hour: number) {
		return filteredSchedules.filter((s: any) => {
			const start = new Date(s.startTime);
			return isSameDay(start, date) && start.getHours() === hour;
		});
	}

	function openDetail(schedule: (typeof data.schedules)[0]) {
		selectedSchedule = schedule;
		isDetailOpen = true;
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
	}
	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
	}
	function goToToday() {
		currentDate = new Date();
	}
	function prevDay() {
		const d = new Date(currentDate);
		d.setDate(d.getDate() - 1);
		currentDate = d;
	}
	function nextDay() {
		const d = new Date(currentDate);
		d.setDate(d.getDate() + 1);
		currentDate = d;
	}
	function isSameDay(a: Date, b: Date) {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}
	function formatTime(date: Date | string) {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(date));
	}
	function formatFullDate(date: Date | string) {
		return new Intl.DateTimeFormat('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(date));
	}

	function toggleSeriesFilter(id: string) {
		if (selectedSeriesIds.includes(id)) {
			selectedSeriesIds = selectedSeriesIds.filter((s) => s !== id);
		} else {
			selectedSeriesIds = [...selectedSeriesIds, id];
		}
	}

	function toggleInstructorFilter(id: string) {
		if (selectedInstructorIds.includes(id)) {
			selectedInstructorIds = selectedInstructorIds.filter((i) => i !== id);
		} else {
			selectedInstructorIds = [...selectedInstructorIds, id];
		}
	}

	function selectDay(date: Date) {
		currentDate = date;
		viewMode = 'day';
	}
</script>

<div class="flex h-full">
	<!-- Sidebar Filter (non-instruktur) -->
	{#if data.role !== 'instruktur'}
		<aside class="flex w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r p-4">
			<div>
				<h3 class="mb-2 text-sm font-semibold">Seri Praktikum</h3>
				<div class="flex flex-col gap-1.5">
					{#each data.series as s (s.id)}
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<Checkbox
								checked={selectedSeriesIds.includes(s.id)}
								onCheckedChange={() => toggleSeriesFilter(s.id)}
							/>
							<span class="truncate">{s.name}</span>
						</label>
					{/each}
				</div>
			</div>

			<div>
				<h3 class="mb-2 text-sm font-semibold">Instruktur</h3>
				<div class="flex max-h-60 flex-col gap-1.5">
					{#each data.instructors as instr (instr.id)}
						<label class="flex cursor-pointer items-center gap-2 text-sm">
							<Checkbox
								checked={selectedInstructorIds.includes(instr.id)}
								onCheckedChange={() => toggleInstructorFilter(instr.id)}
							/>
							<span class="truncate">{instr.name}</span>
						</label>
					{/each}
				</div>
			</div>
		</aside>
	{/if}

	<!-- Main Calendar -->
	<div class="flex flex-1 flex-col overflow-hidden p-6">
		<!-- Dekstop Header -->
		<div class="mb-4 hidden items-center justify-between md:flex">
			<div class="flex items-center gap-2">
				<Button variant="outline" size="icon" onclick={viewMode === 'month' ? prevMonth : prevDay}>
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="icon" onclick={viewMode === 'month' ? nextMonth : nextDay}>
					<ChevronRight class="h-4 w-4" />
				</Button>
				<Button variant="outline" onclick={goToToday}>Hari ini</Button>
			</div>
			<h2 class="text-xl font-semibold">
				{#if viewMode === 'month'}
					{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
				{:else}
					{currentDate.toLocaleDateString('id-ID', {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})}
				{/if}
			</h2>
			<div class="flex overflow-hidden rounded-md border">
				<Button
					variant={viewMode === 'month' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'month')}>Bulan</Button
				>
				<Button
					variant={viewMode === 'day' ? 'default' : 'ghost'}
					size="sm"
					onclick={() => (viewMode = 'day')}>Hari</Button
				>
			</div>
		</div>

		<!-- Mobile Header -->
		<div class="mb-4 flex flex-col justify-between md:hidden">
			<div class="flex items-center gap-2">
				<Button variant="outline" size="icon" onclick={viewMode === 'month' ? prevMonth : prevDay}>
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="icon" onclick={viewMode === 'month' ? nextMonth : nextDay}>
					<ChevronRight class="h-4 w-4" />
				</Button>
				<Button variant="outline" onclick={goToToday}>Hari ini</Button>
				<div class="flex gap-2 overflow-hidden">
					<Button
						variant={viewMode === 'month' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (viewMode = 'month')}>Bulan</Button
					>
					<Button
						variant={viewMode === 'day' ? 'default' : 'outline'}
						size="sm"
						onclick={() => (viewMode = 'day')}>Hari</Button
					>
				</div>
			</div>
			<h2 class="mt-4 text-xl font-semibold">
				{#if viewMode === 'month'}
					{currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
				{:else}
					{currentDate.toLocaleDateString('id-ID', {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})}
				{/if}
			</h2>
		</div>

		{#if viewMode === 'month'}
			<!-- Month View -->
			<div class="grid grid-cols-7 rounded-t-lg border-b bg-card shadow">
				{#each ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as day}
					<div class="py-2 text-center text-sm font-medium text-muted-foreground">{day}</div>
				{/each}
			</div>

			<div class="grid flex-1 grid-cols-7 rounded-b-lg bg-card shadow">
				{#each calendarDays as { date, isCurrentMonth } (date.toISOString())}
					{@const daySchedules = getSchedulesForDate(date)}
					{@const isToday = isSameDay(date, new Date())}
					<button
						type="button"
						class="min-h-30 border-r border-b p-1 text-left transition-colors hover:bg-muted/50 {isCurrentMonth
							? ''
							: 'bg-muted/30'}"
						onclick={() => selectDay(date)}
					>
						<div class="mb-1 text-right">
							<span
								class="inline-flex text-sm {isToday
									? 'h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'
									: 'text-muted-foreground'}"
							>
								{date.getDate()}
							</span>
						</div>

						{#each daySchedules.slice(0, 2) as schedule (schedule.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								role="button"
								tabindex="0"
								class="mb-0.5 w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-xs font-medium text-primary hover:bg-primary/20"
								onclick={(e) => {
									e.stopPropagation();
									openDetail(schedule);
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.stopPropagation();
										openDetail(schedule);
									}
								}}
							>
								<span class="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
								{formatTime(schedule.startTime)}
								{schedule.title}
							</div>
						{/each}
						{#if daySchedules.length > 2}
							<div class="px-1 text-xs text-muted-foreground">
								+{daySchedules.length - 2} lagi
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<!-- Day View -->
			<div class="flex-1 overflow-y-auto rounded-lg bg-card shadow">
				{#each Array.from({ length: 24 }, (_, i) => i) as hour}
					{@const hourSchedules = getSchedulesForHour(currentDate, hour)}
					<div class="flex min-h-16 border-b">
						<div class="w-16 shrink-0 py-1 pr-2 text-right text-xs text-muted-foreground">
							{String(hour).padStart(2, '0')}:00
						</div>
						<div class="relative flex flex-1 flex-col gap-1 border-l p-1">
							{#each hourSchedules as schedule (schedule.id)}
								<button
									type="button"
									class="w-full rounded border-l-2 border-primary bg-primary/10 px-2 py-1 text-left text-xs text-primary hover:bg-primary/20"
									onclick={() => openDetail(schedule)}
								>
									<div class="font-medium">{schedule.title}</div>
									<div class="text-muted-foreground">
										{formatTime(schedule.startTime)} – {formatTime(schedule.endTime)} •
										{schedule.laboratorium.name}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Detail Dialog -->
<Dialog.Root bind:open={isDetailOpen}>
	<Dialog.Content class="max-w-md">
		{#if selectedSchedule}
			<Dialog.Header>
				<Dialog.Title>{selectedSchedule.title}</Dialog.Title>
				<Dialog.Description>
					{selectedSchedule.series?.name ?? 'Tanpa seri'} • {selectedSchedule.laboratorium.name}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-3 py-2 text-sm">
				<div class="flex items-center gap-2">
					<Clock class="h-4 w-4 text-muted-foreground" />
					<span>
						{formatFullDate(selectedSchedule.startTime)} •
						{formatTime(selectedSchedule.startTime)} – {formatTime(selectedSchedule.endTime)}
					</span>
				</div>

				<div class="flex items-start gap-2">
					<Users class="mt-0.5 h-4 w-4 text-muted-foreground" />
					<div>
						<div class="mb-0.5 font-medium">Instruktur</div>
						{#each selectedSchedule.instructors as i (i.instructorId)}
							<div>{i.user.name}</div>
						{/each}
					</div>
				</div>

				{#if selectedSchedule.modules?.length}
					<div class="flex items-start gap-2">
						<BookOpen class="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div>
							<div class="mb-0.5 font-medium">Modul</div>
							{#each selectedSchedule.modules as m (m.moduleId)}
								<div>{m.module.name}</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex gap-2">
					<Badge variant="secondary">{selectedSchedule.type}</Badge>
					<Badge variant="outline">{selectedSchedule.class}</Badge>
				</div>
			</div>

			{#if data.role === 'instruktur'}
				<Dialog.Footer>
					<Button href="/admin/penilaian/{selectedSchedule.id}" class="w-full">
						<ClipboardEdit class="mr-2 h-4 w-4" />
						Buka Halaman Penilaian
					</Button>
				</Dialog.Footer>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
