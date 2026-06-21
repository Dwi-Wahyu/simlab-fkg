<script lang="ts">
	import {
		ArrowLeft,
		BookOpen,
		CheckCircle2,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ClipboardEdit,
		FileText,
		Filter,
		GraduationCap as GraduationIcon,
		Search,
		Stethoscope,
		User,
		Users
	} from '@lucide/svelte';
	import { IsMobile } from '@/hooks/is-mobile-svelte.js';
	import * as Accordion from '$lib/components/ui/accordion';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';

	let { data } = $props();
	const isMobile = new IsMobile();

	// Filter State
	let searchQuery = $state('');
	let statusFilter = $state('all');

	// Group modules if they are multiple
	const modules = $derived(data.schedule.modules.map((m: any) => m.module));

	// Filtered Students
	const filteredStudents = $derived(
		data.students.filter((member: any) => {
			const student = member.user;
			const studentAssessments = data.assessments.filter((a: any) => a.studentId === student.id);
			const isCompleted = studentAssessments.length === modules.length && modules.length > 0;

			const matchesSearch =
				student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				student.username.toLowerCase().includes(searchQuery.toLowerCase());

			let matchesStatus = true;
			if (statusFilter === 'completed') matchesStatus = isCompleted;
			else if (statusFilter === 'partial')
				matchesStatus = studentAssessments.length > 0 && !isCompleted;
			else if (statusFilter === 'none') matchesStatus = studentAssessments.length === 0;

			return matchesSearch && matchesStatus;
		})
	);

	const statusOptions = [
		{ value: 'all', label: 'Semua Status' },
		{ value: 'completed', label: 'Lengkap' },
		{ value: 'partial', label: 'Parsial' },
		{ value: 'none', label: 'Belum Dinilai' }
	];

	const selectedStatusLabel = $derived(
		statusOptions.find((opt) => opt.value === statusFilter)?.label ?? 'Pilih Status'
	);

	// --- Pagination State ---
	let pageSize = $state(15);
	let currentPage = $state(1);

	$effect(() => {
		void searchQuery;
		void statusFilter;
		currentPage = 1;
	});

	const totalPages = $derived(Math.ceil(filteredStudents.length / pageSize));

	const paginatedStudents = $derived(
		filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	function getPageNumbers(current: number, total: number): (number | '...')[] {
		if (total <= 4) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}
		const pages: (number | '...')[] = [];
		if (current <= 2) {
			pages.push(1, 2, 3, '...', total);
		} else if (current >= total - 1) {
			pages.push(1, '...', total - 2, total - 1, total);
		} else {
			pages.push(1, '...', current, current + 1, '...', total);
		}
		return pages;
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<Button variant="outline" href="/admin/penilaian" class="-mb-2 w-fit">
		<ChevronLeft />
		Kembali
	</Button>

	<!-- Header Section -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Catat Nilai</h1>
			<p class="text-muted-foreground">
				{data.schedule.series?.name
					? `${data.schedule.series.name} - ${data.schedule.title}`
					: data.schedule.title} • {data.schedule.laboratorium.name}
			</p>
		</div>
		<div class="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
			<Button
				href="/admin/penilaian/{data.schedule.id}/rekapitulasi"
				size="lg"
				class="w-full md:w-auto"
			>
				<FileText />
				Rekapitulasi Nilai
			</Button>
		</div>
	</div>

	<!-- Main Content: Student List -->
	<Card.Root
		class="border-none bg-transparent py-0 shadow-none ring-0 outline-none md:bg-card md:py-6 md:shadow-sm md:ring-1"
	>
		<Card.Header class="px-0 md:px-6">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<Card.Title>Daftar Mahasiswa</Card.Title>
					<Card.Description>Kelola penilaian mahasiswa untuk jadwal ini.</Card.Description>
				</div>

				<!-- Filters -->
				<div class="flex flex-wrap items-center gap-3">
					<div class="relative w-full max-w-sm md:w-64">
						<Search class="absolute top-3 left-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Cari nama atau NIM..."
							class="pl-9"
							bind:value={searchQuery}
						/>
					</div>

					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger class="w-full sm:w-45">
							<Filter class="mr-2 h-4 w-4 text-muted-foreground" />
							{selectedStatusLabel}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<Select.Root
						type="single"
						value={String(pageSize)}
						onValueChange={(val) => {
							pageSize = Number(val);
							currentPage = 1;
						}}
					>
						<Select.Trigger class="w-full sm:w-45">
							{pageSize} per halaman
						</Select.Trigger>
						<Select.Content>
							{#each [10, 15, 25, 50] as size}
								<Select.Item value={String(size)} label="{size} per halaman"
									>{size} per halaman</Select.Item
								>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="px-0 md:px-6">
			{#if isMobile.current}
				<Accordion.Root type="single" class="w-full">
					{#each paginatedStudents as studentMember (studentMember.id)}
						{@const student = studentMember.user}
						{@const studentAssessments = data.assessments.filter(
							(a: any) => a.studentId === student.id
						)}
						{@const isCompleted =
							studentAssessments.length === modules.length && modules.length > 0}
						<Accordion.Item value={student.id} class="border-b last:border-0">
							<Accordion.Trigger class="px-0 py-4 hover:no-underline">
								<div class="text-left">
									<div class="flex items-center gap-3">
										<div class="flex flex-col">
											<span class="font-medium">{student.name}</span>
											<span class="text-xs text-muted-foreground">{student.username}</span>
										</div>
									</div>
									<div class="mt-1">
										{#if isCompleted}
											<div class="flex items-center gap-1.5 text-green-600">
												<CheckCircle2 class="h-4 w-4" />
												<span class="text-xs font-medium">Lengkap</span>
											</div>
										{:else if studentAssessments.length > 0}
											<div class="flex items-center gap-1.5 text-amber-600">
												<ClipboardEdit class="h-4 w-4" />
												<span class="text-xs font-medium"
													>Parsial ({studentAssessments.length}/{modules.length})</span
												>
											</div>
										{:else}
											<span class="text-xs text-muted-foreground">Belum dinilai</span>
										{/if}
									</div>
								</div>
							</Accordion.Trigger>
							<Accordion.Content>
								<div class="flex flex-col gap-4 py-3">
									<div class="grid grid-cols-2 gap-4">
										<div class="space-y-1">
											<span class="text-[10px] font-semibold text-muted-foreground uppercase"
												>Status Detail</span
											>
											<div class="text-xs font-medium">
												{#if isCompleted}
													<span class="text-green-600"
														>Lengkap ({modules.length}/{modules.length})</span
													>
												{:else if studentAssessments.length > 0}
													<span class="text-amber-600"
														>Parsial ({studentAssessments.length}/{modules.length})</span
													>
												{:else}
													<span class="text-muted-foreground">Belum dinilai</span>
												{/if}
											</div>
										</div>
										<div class="space-y-1">
											<span class="text-[10px] font-semibold text-muted-foreground uppercase"
												>Dinilai Oleh</span
											>
											<div class="flex flex-col gap-0.5">
												{#each [...new Set(studentAssessments.map((a: any) => a.instructor?.name))].filter(Boolean) as instructorName (instructorName)}
													<span class="text-xs">• {instructorName}</span>
												{:else}
													<span class="text-xs italic text-muted-foreground">-</span>
												{/each}
											</div>
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										class="w-full"
										href="/admin/penilaian/{data.schedule.id}/mahasiswa/{student.id}"
									>
										<ClipboardEdit />
										Catat Nilai
									</Button>
								</div>
							</Accordion.Content>
						</Accordion.Item>
					{:else}
						<div class="flex h-24 items-center justify-center text-center">
							<p class="text-muted-foreground">
								{searchQuery || statusFilter !== 'all'
									? 'Tidak ada mahasiswa yang cocok dengan filter.'
									: 'Tidak ada mahasiswa dalam kelas ini.'}
							</p>
						</div>
					{/each}
				</Accordion.Root>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Mahasiswa</Table.Head>
							<Table.Head>Status Nilai</Table.Head>
							<Table.Head>Dinilai Oleh</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each paginatedStudents as studentMember (studentMember.id)}
							{@const student = studentMember.user}
							{@const studentAssessments = data.assessments.filter(
								(a: any) => a.studentId === student.id
							)}
							{@const isCompleted =
								studentAssessments.length === modules.length && modules.length > 0}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
											<User class="h-4 w-4" />
										</div>
										<div class="flex flex-col">
											<span class="font-medium">{student.name}</span>
											<span class="text-xs text-muted-foreground">{student.username}</span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									{#if isCompleted}
										<div class="flex items-center gap-1.5 text-green-600">
											<CheckCircle2 class="h-4 w-4" />
											<span class="text-sm font-medium">Lengkap</span>
										</div>
									{:else if studentAssessments.length > 0}
										<div class="flex items-center gap-1.5 text-amber-600">
											<ClipboardEdit class="h-4 w-4" />
											<span class="text-sm font-medium"
												>Parsial ({studentAssessments.length}/{modules.length})</span
											>
										</div>
									{:else}
										<span class="text-sm text-muted-foreground">Belum dinilai</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-1">
										{#each [...new Set(studentAssessments.map((a: any) => a.instructor?.name))].filter(Boolean) as instructorName (instructorName)}
											<span class="text-xs text-muted-foreground">• {instructorName}</span>
										{:else}
											<span class="text-xs text-muted-foreground italic">-</span>
										{/each}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="outline"
										size="lg"
										href="/admin/penilaian/{data.schedule.id}/mahasiswa/{student.id}"
									>
										<ClipboardEdit />
										Catat Nilai
									</Button>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={4} class="h-24 text-center">
									{searchQuery || statusFilter !== 'all'
										? 'Tidak ada mahasiswa yang cocok dengan filter.'
										: 'Tidak ada mahasiswa dalam kelas ini.'}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>

		<!-- Pagination Controls -->
		{#if totalPages > 1}
			<div
				class="flex flex-col-reverse items-center gap-3 px-0 py-4 sm:flex-row sm:justify-between md:flex-row md:items-center md:px-6"
			>
				<div class="flex items-center gap-3">
					<p class="text-sm text-muted-foreground">
						Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(
							currentPage * pageSize,
							filteredStudents.length
						)} dari {filteredStudents.length} mahasiswa
					</p>
				</div>

				<div class="flex items-center gap-1">
				
					<Button
						variant="outline"
						size="icon"
						disabled={currentPage === 1}
						onclick={() => currentPage--}
						aria-label="Halaman sebelumnya"
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>

					{#each getPageNumbers(currentPage, totalPages) as pg}
						{#if pg === '...'}
							<span class="px-2 text-muted-foreground">…</span>
						{:else}
							<Button
								variant={currentPage === pg ? 'default' : 'outline'}
								size="icon"
								onclick={() => (currentPage = pg as number)}
							>
								{pg}
							</Button>
						{/if}
					{/each}

					<Button
						variant="outline"
						size="icon"
						disabled={currentPage === totalPages}
						onclick={() => currentPage++}
						aria-label="Halaman berikutnya"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				
				</div>
			</div>
		{/if}
	</Card.Root>

	<!-- Info Bar (Horizontal Summary) -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Stethoscope class="h-5 w-5 text-primary" />
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Jenis</span
					>
					<span class="font-bold">{data.schedule.type}</span>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
					<GraduationIcon class="h-5 w-5 text-blue-500" />
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Kelas</span
					>
					<span class="font-bold">{data.schedule.class}</span>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
					<BookOpen class="h-5 w-5 text-amber-500" />
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Modul</span
					>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each modules as mod (mod.id)}
							<span
								class={badgeVariants({ variant: 'secondary' }) +
									' h-4 py-0 text-[10px] wrap-break-word'}>{mod.name}</span
							>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
					<Users class="h-5 w-5 text-green-500" />
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
						>Peserta</span
					>
					<span class="font-bold">{data.students.length} Mahasiswa</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
