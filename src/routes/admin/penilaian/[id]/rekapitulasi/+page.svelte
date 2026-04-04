<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import {
		ArrowLeft,
		Search,
		Download,
		ChevronLeft,
		ChevronRight,
		Calendar,
		GraduationCap,
		Users,
		BookOpen
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let searchQuery = $state(data.search);

	$effect(() => {
		searchQuery = data.search;
	});

	async function handleSearch(e: Event) {
		e.preventDefault();
		const url = new URL(page.url);
		url.searchParams.set('search', searchQuery);
		url.searchParams.set('page', '1');
		await goto(url.toString(), { keepFocus: true });
	}

	async function goToPage(p: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', p.toString());
		await goto(url.toString());
	}

	// Group modules by schedule
	const groupedColumns = $derived(
		data.allSchedules.map((s: any) => ({
			scheduleId: s.id,
			title: s.title,
			modules: s.modules.map((m: any) => m.module)
		}))
	);

	const allModules = $derived(groupedColumns.flatMap((col) => col.modules));

	function getScore(studentId: string, scheduleId: string, moduleId: string) {
		const assessment = data.assessments.find(
			(a: any) =>
				a.studentId === studentId && a.scheduleId === scheduleId && a.moduleId === moduleId
		);
		return assessment ? assessment.score : '-';
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2">
				<h1 class="text-3xl font-bold tracking-tight">
					{data.schedule.series?.name ?? 'Rekapitulasi Nilai'}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground md:text-base">
				Laporan seluruh hasil penilaian mahasiswa untuk seri {data.schedule.series?.name ??
					data.schedule.title}.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" class="hidden md:flex">
				<Download class="mr-2 h-4 w-4" />
				Export Excel
			</Button>
			<Button variant="ghost" href="/admin/penilaian/{data.schedule.id}" class="hidden md:flex">
				Kembali
			</Button>
		</div>
	</div>

	<!-- Schedule Summary Card -->
	<Card.Root>
		<Card.Header class="pb-4">
			<Card.Title>Informasi Jadwal</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
						<BookOpen class="h-5 w-5 text-primary" />
					</div>
					<div class="flex flex-col">
						<span class="text-xs font-medium text-muted-foreground uppercase">Kegiatan</span>
						<span class="font-bold">{data.schedule.series?.name ?? data.schedule.title}</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
						<Calendar class="h-5 w-5 text-amber-500" />
					</div>
					<div class="flex flex-col">
						<span class="text-xs font-medium text-muted-foreground uppercase">Blok</span>
						<span class="font-bold">{data.schedule.block?.name ?? '-'}</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
						<GraduationCap class="h-5 w-5 text-blue-500" />
					</div>
					<div class="flex flex-col">
						<span class="text-xs font-medium text-muted-foreground uppercase">Angkatan</span>
						<span class="font-bold">{data.schedule.practicumClass?.batch ?? '-'}</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
						<Calendar class="h-5 w-5 text-indigo-500" />
					</div>
					<div class="flex flex-col">
						<span class="text-xs font-medium text-muted-foreground uppercase">Semester</span>
						<span class="font-bold">{data.schedule.semester ?? '-'}</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
						<Users class="h-5 w-5 text-green-500" />
					</div>
					<div class="flex flex-col">
						<span class="text-xs font-medium text-muted-foreground uppercase">Kelas</span>
						<span class="font-bold"
							>{data.schedule.practicumClass?.name ?? data.schedule.class}</span
						>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Main Table Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<Card.Title>Daftar Nilai Mahasiswa</Card.Title>
				<form onsubmit={handleSearch} class="relative w-full max-w-sm">
					<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Cari nama mahasiswa..."
						class="pl-9"
						bind:value={searchQuery}
					/>
				</form>
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
							{#each groupedColumns as col}
								<Table.Head
									colspan={col.modules.length}
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
							{#each groupedColumns as col}
								{#each col.modules as mod}
									<Table.Head
										class="min-w-[100px] border-r py-1 text-center text-[10px] font-semibold tracking-wider uppercase"
									>
										{col.modules.length > 1 ? mod.name : ''}
									</Table.Head>
								{/each}
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.students as student (student.id)}
							{@const studentScores = groupedColumns.flatMap((col) =>
								col.modules.map((m) => {
									const val = getScore(student.userId, col.scheduleId, m.id);
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
										<span class="line-clamp-1 text-xs md:text-sm">{student.name}</span>
										<span class="font-mono text-[10px] text-muted-foreground"
											>{student.username}</span
										>
									</div>
								</Table.Cell>
								{#each groupedColumns as col}
									{#each col.modules as mod}
										<Table.Cell class="border-r text-center">
											{getScore(student.userId, col.scheduleId, mod.id)}
										</Table.Cell>
									{/each}
								{/each}
								<Table.Cell class="bg-muted/20 text-center font-bold">
									{average}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={allModules.length + 2} class="h-24 text-center">
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
					Menampilkan <span class="font-medium">{data.students.length}</span> dari
					<span class="font-medium">{data.totalStudents}</span> mahasiswa.
				</p>
				<div class="order-1 flex items-center gap-2 md:order-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.page <= 1}
						onclick={() => goToPage(data.pagination.page - 1)}
					>
						<ChevronLeft class="mr-1 h-4 w-4" />
						Sebelumnya
					</Button>
					<div class="flex items-center gap-1 px-2 text-sm font-medium">
						Halaman {data.pagination.page} dari {data.pagination.totalPages || 1}
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.page >= data.pagination.totalPages}
						onclick={() => goToPage(data.pagination.page + 1)}
					>
						Selanjutnya
						<ChevronRight class="ml-1 h-4 w-4" />
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
