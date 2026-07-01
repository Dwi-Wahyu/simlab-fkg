<script lang="ts">
	import {
		BookOpen,
		Calendar,
		ChevronLeft,
		ChevronRight,
		Download,
		GraduationCap,
		Search,
		Users,
		ClipboardCheck
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

	let selectedInstructorId = $state(data.instructorId || '');
	let selectedSeriesId = $state(data.seriesId || '');
	let searchQuery = $state('');
	let currentPage = $state(1);
	const pageSize = 10;

	$effect(() => {
		selectedInstructorId = data.instructorId || '';
		selectedSeriesId = data.seriesId || '';
	});

	async function handleSwitch() {
		const url = new URL(page.url);
		url.searchParams.set('instructorId', selectedInstructorId);
		url.searchParams.set('seriesId', selectedSeriesId);
		await goto(url.toString(), { keepFocus: true });
	}

	async function goToPage(p: number) {
		currentPage = p;
	}

	const filteredStudents = $derived(
		data.students.filter((s: any) =>
			s.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			s.user.username.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const totalPages = $derived(Math.ceil(filteredStudents.length / pageSize));
	const paginatedStudents = $derived(
		filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	$effect(() => {
		void searchQuery;
		currentPage = 1;
	});

	const firstSchedule = $derived(data.schedules[0] || null);
	const angkatan = $derived(firstSchedule?.practicumClass?.batch ?? '-');
	const semester = $derived(firstSchedule?.semester ?? '-');
	const kelas = $derived(firstSchedule?.practicumClass?.name ?? firstSchedule?.class ?? '-');

	const groupedColumns = $derived(data.groupedColumns || []);
	const allColumns = $derived(groupedColumns.flatMap((g: any) => g.columns));

	function getScore(studentId: string, scheduleId: string, moduleId: string) {
		const assessment = data.assessments.find(
			(a: any) =>
				a.studentId === studentId && a.scheduleId === scheduleId && a.moduleId === moduleId
		);
		return assessment ? assessment.score : '-';
	}

	const instructorTrigger = $derived(
		data.instructorOptions.find((i: any) => i.id === selectedInstructorId)?.name ?? 'Pilih Instruktur'
	);

	const seriesTrigger = $derived(
		data.seriesOptions.find((s: any) => s.id === selectedSeriesId)?.name ?? 'Pilih Seri'
	);
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">
				{data.selectedInstructor?.name ?? 'Rekapitulasi Nilai'}
			</h1>
			{#if data.selectedInstructor}
				<p class="text-sm text-muted-foreground md:text-base">
					NIM/NIP: {data.selectedInstructor.username} • Seri: {data.selectedSeries?.name ?? '-'}
				</p>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				class="hidden md:flex"
				href="/admin/rekapitulasi/export?instructorId={data.instructorId}&seriesId={data.seriesId}"
				disabled={!data.instructorId || !data.seriesId}
			>
				<Download class="mr-2 h-4 w-4" />
				Export Excel
			</Button>
		</div>
	</div>

	<!-- Selector Dropdowns -->
	<Card.Root>
		<Card.Content class="p-4 flex flex-col gap-4 sm:flex-row sm:items-center">
			<div class="flex-1">
				<label for="instructor-select" class="block text-xs font-semibold text-muted-foreground uppercase mb-1">Instruktur</label>
				<Select.Root
					type="single"
					bind:value={selectedInstructorId}
					onValueChange={handleSwitch}
				>
					<Select.Trigger class="w-full text-left">
						{instructorTrigger}
					</Select.Trigger>
					<Select.Content>
						{#each data.instructorOptions as inst (inst.id)}
							<Select.Item value={inst.id} label={inst.name}>{inst.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="flex-1">
				<label for="series-select" class="block text-xs font-semibold text-muted-foreground uppercase mb-1">Seri Praktikum</label>
				<Select.Root
					type="single"
					bind:value={selectedSeriesId}
					onValueChange={handleSwitch}
				>
					<Select.Trigger class="w-full text-left">
						{seriesTrigger}
					</Select.Trigger>
					<Select.Content>
						{#each data.seriesOptions as series (series.id)}
							<Select.Item value={series.id} label={series.name}>{series.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Schedule Info Cards -->
	{#if firstSchedule}
		<Card.Root>
			<Card.Header>
				<Card.Title>Informasi Kegiatan</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<BookOpen class="h-5 w-5 text-primary" />
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-medium text-muted-foreground uppercase">Seri</span>
							<span class="font-bold">{data.selectedSeries?.name ?? '-'}</span>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
							<GraduationCap class="h-5 w-5 text-blue-500" />
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-medium text-muted-foreground uppercase">Angkatan</span>
							<span class="font-bold">{angkatan}</span>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
							<Calendar class="h-5 w-5 text-indigo-500" />
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-medium text-muted-foreground uppercase">Semester</span>
							<span class="font-bold">{semester}</span>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
							<Users class="h-5 w-5 text-green-500" />
						</div>
						<div class="flex flex-col">
							<span class="text-xs font-medium text-muted-foreground uppercase">Kelas</span>
							<span class="font-bold">{kelas}</span>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Main Table Card -->
	<Card.Root mobileAware={true}>
		<Card.Header>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Card.Title>Daftar Nilai Mahasiswa</Card.Title>
				<div class="relative w-full max-w-sm">
					<Search class="absolute top-3 left-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Cari nama mahasiswa..."
						class="pl-9"
						bind:value={searchQuery}
					/>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<!-- First Level Header: Activities -->
						<Table.Row>
							<Table.Head
								rowspan={2}
								class="sticky left-0 z-20 w-[250px] border-r bg-background text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
								>Mahasiswa</Table.Head
							>
							{#each groupedColumns as col (col.scheduleId)}
								<Table.Head
									colspan={col.singleColumn ? undefined : col.columns.length}
									rowspan={col.singleColumn ? 2 : undefined}
									class="border-r border-b bg-muted/20 text-center font-bold"
								>
									{col.title}
								</Table.Head>
							{/each}
							<Table.Head rowspan={2} class="min-w-[100px] bg-muted/40 text-center font-bold"
								>Rata-rata</Table.Head
							>
						</Table.Row>
						<!-- Second Level Header: Modules -->
						<Table.Row>
							{#each groupedColumns as col (col.scheduleId)}
								{#if !col.singleColumn}
									{#each col.columns as c (c.moduleId)}
										<Table.Head
											class="min-w-[100px] border-r py-1 text-center text-[10px] font-semibold tracking-wider uppercase"
										>
											{c.subLabel}
										</Table.Head>
									{/each}
								{/if}
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginatedStudents as student (student.id)}
							{@const studentScores = groupedColumns.flatMap((col) =>
								col.columns.map((c) => {
									const val = getScore(student.userId, col.scheduleId, c.moduleId);
									return typeof val === 'number' ? val : null;
								})
							)}
							{@const validScores = studentScores.filter((s) => s !== null) as number[]}
							{@const average =
								validScores.length > 0
									? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
									: '-'}
							<Table.Row>
								<Table.Cell
									class="sticky left-0 z-10 border-r bg-background font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
								>
									<div class="flex flex-col">
										<span class="line-clamp-1 text-xs md:text-sm">{student.user?.name}</span>
										<span class="font-mono text-[10px] text-muted-foreground"
											>{student.user?.username}</span
										>
									</div>
								</Table.Cell>
								{#each groupedColumns as col (col.scheduleId)}
									{#each col.columns as c (c.moduleId)}
										<Table.Cell class="border-r text-center">
											{getScore(student.userId, col.scheduleId, c.moduleId)}
										</Table.Cell>
									{/each}
								{/each}
								<Table.Cell class="bg-muted/20 text-center font-bold">
									{average}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={allColumns.length + 2} class="h-24 text-center">
									Tidak ada data mahasiswa ditemukan.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<!-- Pagination -->
			<div class="mt-4 flex flex-col items-center justify-between gap-4 md:flex-row">
				<p class="order-2 text-sm text-muted-foreground md:order-1">
					Menampilkan <span class="font-medium">{paginatedStudents.length}</span> dari
					<span class="font-medium">{filteredStudents.length}</span> mahasiswa.
				</p>
				<div class="order-1 flex items-center gap-2 md:order-2">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage <= 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						<ChevronLeft class="mr-1 h-4 w-4" />
						Sebelumnya
					</Button>
					<div class="flex items-center gap-1 px-2 text-sm font-medium">
						Halaman {currentPage} dari {totalPages || 1}
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage >= totalPages}
						onclick={() => goToPage(currentPage + 1)}
					>
						Selanjutnya
						<ChevronRight class="ml-1 h-4 w-4" />
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
