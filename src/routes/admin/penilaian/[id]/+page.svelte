<script lang="ts">
	import {
		AlertCircle,
		ChevronLeft,
		ChevronRight,
		ClipboardEdit,
		FileText,
		Filter,
		Info,
		Search,
		Users
	} from '@lucide/svelte';
	import { IsMobile } from '@/hooks/is-mobile-svelte.js';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from '$lib/components/toast';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const isMobile = new IsMobile();

	// Filter State
	let searchQuery = $state('');
	let statusFilter = $state('all');

	// Group columns derived state
	const columns = $derived.by(() => {
		const cols: any[] = [];
		const groupedMap = new Map<string, any[]>();

		for (const sm of data.schedule.modules) {
			const m = sm.module;
			if (m.groupLabel) {
				if (!groupedMap.has(m.groupLabel)) {
					groupedMap.set(m.groupLabel, []);
				}
				groupedMap.get(m.groupLabel)!.push(m);
			} else {
				cols.push({ kind: 'single', module: m });
			}
		}

		for (const [label, list] of groupedMap.entries()) {
			list.sort((a, b) => {
				if (a.component === 'PREPARASI') return -1;
				if (b.component === 'PREPARASI') return 1;
				return 0;
			});
			cols.push({
				kind: 'grouped',
				label,
				sub: list.map((m) => ({ component: m.component, module: m }))
			});
		}

		const orderMap = new Map<string, number>();
		data.schedule.modules.forEach((sm: any, index: number) => {
			orderMap.set(sm.module.id, index);
		});

		cols.sort((a, b) => {
			const idxA =
				a.kind === 'single'
					? orderMap.get(a.module.id)!
					: Math.min(...a.sub.map((s: any) => orderMap.get(s.module.id)!));
			const idxB =
				b.kind === 'single'
					? orderMap.get(b.module.id)!
					: Math.min(...b.sub.map((s: any) => orderMap.get(s.module.id)!));
			return idxA - idxB;
		});

		return cols;
	});

	const hasGroupedColumns = $derived(columns.some((c) => c.kind === 'grouped'));

	// Calculate total colspans
	const totalColspan = $derived.by(() => {
		let count = 3; // Mahasiswa, Rata-rata, Aksi
		for (const col of columns) {
			if (col.kind === 'single') count += 1;
			else count += col.sub.length;
		}
		return count;
	});

	// Filtered Students
	const filteredStudents = $derived(
		data.students.filter((student: any) => {
			const studentAssessments = data.assessments.filter((a: any) => a.studentId === student.id);
			const modulesCount = data.schedule.modules.length;
			const isCompleted = studentAssessments.length === modulesCount && modulesCount > 0;

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

	// Dynamic save states
	let savingStates = $state<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
	let savingMessages = $state<Record<string, string>>({});

	// Dialog scoring state
	let isScoringDialogOpen = $state(false);
	let activeStudent = $state<any>(null);
	let activeModule = $state<any>(null);
	let activeAssessment = $state<any>(null);
	let criteriaValues = $state<Record<string, number>>({});
	let notesValue = $state('');
	let isSubmittingDialog = $state(false);

	const dialogSections = $derived.by(() => {
		if (!activeModule) return [];
		const secs: Record<string, any[]> = {};
		for (const crit of activeModule.criteria) {
			const label = crit.sectionLabel || '';
			if (!secs[label]) secs[label] = [];
			secs[label].push(crit);
		}
		return Object.entries(secs).map(([label, items]) => ({ label, items }));
	});

	const liveChecklistScore = $derived.by(() => {
		if (!activeModule || activeModule.scoringMode !== 'CHECKLIST') return 0;
		let total = 0;
		let max = 0;
		for (const crit of activeModule.criteria) {
			total += criteriaValues[crit.id] ?? 0;
			max += crit.maxScore;
		}
		return max > 0 ? Math.round((total / max) * 100) : 0;
	});

	const liveRubrikScore = $derived.by(() => {
		if (!activeModule || activeModule.scoringMode !== 'RUBRIK') return 0;
		let total = 0;
		for (const crit of activeModule.criteria) {
			total += criteriaValues[crit.id] ?? 0;
		}
		const count = activeModule.criteria.length;
		return count > 0 ? Math.round(total / count) : 0;
	});

	function getAssessment(studentId: string, moduleId: string) {
		return data.assessments.find((a) => a.studentId === studentId && a.moduleId === moduleId);
	}

	function getStudentAverage(studentId: string) {
		const studentAssessments = data.assessments.filter(
			(a) => a.studentId === studentId && a.status === 'FINAL'
		);
		if (studentAssessments.length === 0) return '-';
		const total = studentAssessments.reduce((sum, a) => sum + a.score, 0);
		return Math.round(total / studentAssessments.length);
	}

	function hasChecklistAssessments(studentId: string) {
		const studentAssessments = data.assessments.filter((a) => a.studentId === studentId);
		return studentAssessments.some((a) => {
			const sm = data.schedule.modules.find((m) => m.moduleId === a.moduleId);
			return sm?.module?.scoringMode === 'CHECKLIST';
		});
	}

	async function handleSaveScore(studentId: string, moduleId: string, valueStr: string) {
		const key = `${studentId}_${moduleId}`;
		const score = parseInt(valueStr);
		if (valueStr.trim() === '') return;
		if (isNaN(score) || score < 0 || score > 100) {
			toast.destructive('Gagal', { description: 'Skor harus antara 0 dan 100.' });
			return;
		}

		savingStates[key] = 'saving';

		const formData = new FormData();
		formData.append('studentId', studentId);
		formData.append('moduleId', moduleId);
		formData.append('score', String(score));

		try {
			const res = await fetch(`?/saveAssessment`, {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			const responseObj = typeof result === 'string' ? JSON.parse(result) : result;

			if (responseObj.type === 'success') {
				savingStates[key] = 'saved';
				await invalidateAll();
				setTimeout(() => {
					if (savingStates[key] === 'saved') {
						savingStates[key] = 'idle';
					}
				}, 2000);
			} else {
				savingStates[key] = 'error';
				const msg = responseObj.data?.message || 'Gagal menyimpan.';
				savingMessages[key] = msg;
				toast.destructive('Gagal', { description: msg });
			}
		} catch (err) {
			console.error(err);
			savingStates[key] = 'error';
			savingMessages[key] = 'Kesalahan jaringan.';
		}
	}

	function openScoringDialog(student: any, module: any) {
		activeStudent = student;
		activeModule = module;
		activeAssessment = getAssessment(student.id, module.id);
		notesValue = activeAssessment?.notes ?? '';

		criteriaValues = {};
		for (const crit of module.criteria) {
			const existingScore = data.criteriaScores.find(
				(cs) => cs.assessmentId === activeAssessment?.id && cs.criteriaId === crit.id
			);
			criteriaValues[crit.id] = existingScore?.score ?? 0;
		}

		isScoringDialogOpen = true;
	}

	async function submitDialogScore() {
		if (!activeStudent || !activeModule) return;
		isSubmittingDialog = true;

		const formData = new FormData();
		formData.append('studentId', activeStudent.id);
		formData.append('moduleId', activeModule.id);
		formData.append('notes', notesValue);

		for (const [critId, val] of Object.entries(criteriaValues)) {
			formData.append(`criteriaScore_${critId}`, String(val));
		}

		try {
			const res = await fetch(`?/saveAssessment`, {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			const responseObj = typeof result === 'string' ? JSON.parse(result) : result;

			if (responseObj.type === 'success') {
				toast.success('Berhasil', {
					description: 'Penilaian berhasil disimpan.'
				});
				isScoringDialogOpen = false;
				await invalidateAll();
			} else {
				const msg = responseObj.data?.message || 'Gagal menyimpan.';
				toast.destructive('Gagal', { description: msg });
			}
		} catch (err) {
			console.error(err);
			toast.destructive('Gagal', { description: 'Kesalahan jaringan.' });
		} finally {
			isSubmittingDialog = false;
		}
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
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">Catat Nilai</h1>
			<p class="text-slate-500">
				{data.schedule.series?.name
					? `${data.schedule.series.name} - ${data.schedule.title}`
					: data.schedule.title} • {data.schedule.laboratorium.name}
			</p>
		</div>
		<div class="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
			<Button
				href="/admin/penilaian/{data.schedule.id}/rekapitulasi"
				size="lg"
				class="w-full bg-[#2D5A43] text-white hover:bg-[#234735] md:w-auto"
			>
				<FileText class="size-4" />
				Rekapitulasi Nilai
			</Button>
		</div>
	</div>

	<!-- Filter Group Selection (Visible to Superadmin/Koordinator) -->
	{#if ['superadmin', 'koordinator'].includes(data.userRole)}
		<div class="flex items-center gap-4 rounded-lg border bg-white p-4">
			<Label class="text-sm font-medium text-slate-700">Filter Kelompok:</Label>
			<Select.Root
				type="single"
				value={data.selectedGroupId}
				onValueChange={(val) => {
					const url = new URL(page.url);
					if (val) {
						url.searchParams.set('groupId', val);
					} else {
						url.searchParams.delete('groupId');
					}
					goto(url.toString());
				}}
			>
				<Select.Trigger class="w-[250px] bg-white">
					{data.groups.find((g) => g.id === data.selectedGroupId)?.name || 'Semua Kelompok'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="" label="Semua Kelompok">Semua Kelompok</Select.Item>
					{#each data.groups as group}
						<Select.Item value={group.id} label={group.name}>{group.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	{/if}

	<!-- Main Table -->
	<Card.Root class="overflow-hidden border bg-white p-0 shadow-sm ring-1 ring-slate-100">
		<Card.Header class="border-b px-6 py-4">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<Card.Title class="text-lg font-semibold text-slate-900">Daftar Mahasiswa</Card.Title>
					<Card.Description>Lakukan penilaian mahasiswa secara dinamis dan live.</Card.Description>
				</div>

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
						<Select.Trigger class="w-full bg-white sm:w-45">
							<Filter class="mr-2 h-4 w-4 text-muted-foreground" />
							{selectedStatusLabel}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="overflow-hidden p-0">
			<!-- Responsive Scroll Table -->
			<div class="overflow-x-auto">
				<Table.Root class="w-full min-w-[800px] table-fixed">
					<Table.Header class="bg-slate-50">
						<!-- Row 1 -->
						<Table.Row>
							<Table.Head
								rowspan={hasGroupedColumns ? 2 : 1}
								class="w-[220px] px-4 py-3 align-middle font-semibold text-slate-900"
							>
								Mahasiswa
							</Table.Head>
							{#each columns as col}
								{#if col.kind === 'single'}
									<Table.Head
										rowspan={hasGroupedColumns ? 2 : 1}
										class="max-w-[200px] min-w-[120px] px-4 py-3 text-center align-middle font-semibold break-words whitespace-normal text-slate-900"
									>
										<div class="flex items-center justify-center gap-1">
											<span>{col.module.name}</span>
											{#if col.module.criteria && col.module.criteria.length > 0}
												<Popover.Root>
													<Popover.Trigger>
														<Button
															variant="ghost"
															size="icon"
															class="flex h-5 w-5 items-center justify-center rounded-full p-0 hover:bg-slate-200/50"
														>
															<Info class="h-3.5 w-3.5 text-slate-500" />
														</Button>
													</Popover.Trigger>
													<Popover.Content
														class="max-h-[350px] w-80 space-y-3 overflow-y-auto rounded-lg border bg-white p-4 text-left text-slate-900 shadow-lg"
													>
														<div class="space-y-2">
															<h4 class="border-b pb-1 text-xs font-bold text-slate-800">
																Panduan Rubrik: {col.module.name}
															</h4>
															{#each col.module.criteria as crit}
																<div class="space-y-1">
																	<p class="text-[11px] font-semibold text-slate-800">
																		{crit.name} (Max: {crit.maxScore})
																	</p>
																	{#if crit.description}
																		<p class="text-[10px] text-slate-500 italic">
																			{crit.description}
																		</p>
																	{/if}
																	{#if crit.bands && crit.bands.length > 0}
																		<div class="mt-0.5 space-y-1 border-l border-slate-200 pl-2">
																			{#each crit.bands as band}
																				<p class="text-[10px] text-slate-600">
																					<span class="font-mono font-semibold text-primary"
																						>{band.minScore}-{band.maxScore}</span
																					>: {band.description}
																				</p>
																			{/each}
																		</div>
																	{/if}
																</div>
															{/each}
														</div>
													</Popover.Content>
												</Popover.Root>
											{/if}
										</div>
									</Table.Head>
								{:else}
									<Table.Head
										colspan={col.sub.length}
										class="max-w-[250px] border-b px-4 py-2 text-center font-semibold break-words whitespace-normal text-slate-900"
									>
										{col.label}
									</Table.Head>
								{/if}
							{/each}
							<Table.Head
								rowspan={hasGroupedColumns ? 2 : 1}
								class="w-[120px] px-4 py-3 text-center align-middle font-semibold text-slate-900"
							>
								RATA-RATA
							</Table.Head>
							<Table.Head
								rowspan={hasGroupedColumns ? 2 : 1}
								class="w-[220px] px-4 py-3 text-right align-middle font-semibold text-slate-900"
							>
								Aksi
							</Table.Head>
						</Table.Row>

						<!-- Row 2 -->
						{#if hasGroupedColumns}
							<Table.Row>
								{#each columns as col}
									{#if col.kind === 'grouped'}
										{#each col.sub as sub}
											<Table.Head
												class="w-[100px] border-l px-3 py-1.5 text-center text-xs font-semibold text-slate-600"
											>
												<div class="flex items-center justify-center gap-1">
													<span>{sub.component === 'PREPARASI' ? 'PREP' : 'RESTO'}</span>
													{#if sub.module.criteria && sub.module.criteria.length > 0}
														<Popover.Root>
															<Popover.Trigger>
																<Button
																	variant="ghost"
																	size="icon"
																	class="flex h-4 w-4 items-center justify-center rounded-full p-0 hover:bg-slate-200/50"
																>
																	<Info class="h-3 w-3 text-slate-400" />
																</Button>
															</Popover.Trigger>
															<Popover.Content
																class="max-h-[350px] w-80 space-y-3 overflow-y-auto rounded-lg border bg-white p-4 text-left text-slate-900 shadow-lg"
															>
																<div class="space-y-2">
																	<h4 class="border-b pb-1 text-xs font-bold text-slate-800">
																		Panduan Rubrik: {col.label} ({sub.component})
																	</h4>
																	{#each sub.module.criteria as crit}
																		<div class="space-y-1">
																			<p class="text-[11px] font-semibold text-slate-800">
																				{crit.name} (Max: {crit.maxScore})
																			</p>
																			{#if crit.description}
																				<p class="text-[10px] text-slate-500 italic">
																					{crit.description}
																				</p>
																			{/if}
																			{#if crit.bands && crit.bands.length > 0}
																				<div
																					class="mt-0.5 space-y-1 border-l border-slate-200 pl-2"
																				>
																					{#each crit.bands as band}
																						<p class="text-[10px] text-slate-600">
																							<span class="font-mono font-semibold text-primary"
																								>{band.minScore}-{band.maxScore}</span
																							>: {band.description}
																						</p>
																					{/each}
																				</div>
																			{/if}
																		</div>
																	{/each}
																</div>
															</Popover.Content>
														</Popover.Root>
													{/if}
												</div>
											</Table.Head>
										{/each}
									{/if}
								{/each}
							</Table.Row>
						{/if}
					</Table.Header>

					<Table.Body>
						{#if paginatedStudents.length === 0}
							<Table.Row>
								<Table.Cell colspan={totalColspan} class="h-32 text-center text-slate-500">
									Tidak ada mahasiswa dalam kelas/kelompok ini.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each paginatedStudents as student (student.id)}
								<Table.Row class="hover:bg-slate-50/30">
									<!-- Name / NIM -->
									<Table.Cell class="px-4 py-3 font-medium text-slate-900">
										<div class="flex flex-col">
											<span class="text-sm font-semibold">{student.name}</span>
											<div class="mt-0.5 flex items-center gap-1.5">
												<span class="text-xs text-slate-500 uppercase">{student.username}</span>
												{#if data.studentKelompokMap?.[student.id]}
													<span
														class="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-500/10 ring-inset"
													>
														{data.studentKelompokMap[student.id]}
													</span>
												{/if}
											</div>
										</div>
									</Table.Cell>

									<!-- Assessment Cells -->
									{#each columns as col}
										{#if col.kind === 'single'}
											<Table.Cell class="px-4 py-3 text-center">
												{@render scoringCell(student, col.module)}
											</Table.Cell>
										{:else}
											{#each col.sub as sub}
												<Table.Cell class="border-l px-3 py-3 text-center">
													{@render scoringCell(student, sub.module)}
												</Table.Cell>
											{/each}
										{/if}
									{/each}

									<!-- Average -->
									<Table.Cell class="px-4 py-3 text-center text-sm font-bold text-[#2D5A43]">
										{getStudentAverage(student.id)}
									</Table.Cell>

									<!-- Action -->
									<Table.Cell class="px-4 py-3 text-right">
										<div class="flex items-center justify-end gap-2">
											{#if hasChecklistAssessments(student.id)}
												<Button
													href="/admin/penilaian/{data.schedule
														.id}/mahasiswa/{student.id}/export-csl"
													variant="outline"
													size="sm"
													class="gap-1.5 text-[#2D5A43] hover:bg-slate-50 hover:text-[#234735]"
												>
													<FileText class="size-3.5" /> Export CSL
												</Button>
											{/if}
											<Button
												variant="outline"
												size="sm"
												href="/admin/penilaian/{data.schedule.id}/mahasiswa/{student.id}"
												class="gap-1.5"
											>
												<ClipboardEdit class="size-3.5" /> Detail
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div
				class="flex flex-col items-center justify-between gap-4 border-t bg-slate-50/50 px-6 py-4 sm:flex-row"
			>
				<p class="text-sm text-slate-500">
					Menampilkan {(currentPage - 1) * pageSize + 1}–{Math.min(
						currentPage * pageSize,
						filteredStudents.length
					)} dari {filteredStudents.length} mahasiswa
				</p>

				<div class="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						disabled={currentPage === 1}
						onclick={() => currentPage--}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>

					{#each getPageNumbers(currentPage, totalPages) as pg}
						{#if pg === '...'}
							<span class="px-2 text-slate-400">…</span>
						{:else}
							<Button
								variant={currentPage === pg ? 'default' : 'outline'}
								size="icon"
								class={currentPage === pg ? 'bg-[#2D5A43] text-white' : ''}
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
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	</Card.Root>
</div>

<!-- SCORING INLINE SNIPPET -->
{#snippet scoringCell(student: any, module: any)}
	{@const assess = getAssessment(student.id, module.id)}
	{@const key = `${student.id}_${module.id}`}

	{#if module.scoringMode === 'TOTAL'}
		<div class="relative mx-auto flex w-[75px] items-center justify-center gap-1.5">
			<input
				type="number"
				value={assess?.score ?? ''}
				placeholder="-"
				min="0"
				max="100"
				class="h-8 w-full rounded border border-slate-200 text-center text-sm outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
				onblur={(e) => handleSaveScore(student.id, module.id, (e.target as HTMLInputElement).value)}
			/>
			{#if savingStates[key] === 'saving'}
				<span class="absolute right-1 flex size-1.5 animate-ping rounded-full bg-blue-500"></span>
			{:else if savingStates[key] === 'saved'}
				<span class="absolute right-1 flex size-1.5 rounded-full bg-green-500"></span>
			{:else if savingStates[key] === 'error'}
				<span
					class="absolute right-1 flex size-1.5 animate-bounce rounded-full bg-red-500"
					title={savingMessages[key]}
				></span>
			{/if}
		</div>
	{:else if module.scoringMode === 'RUBRIK'}
		<button
			type="button"
			onclick={() => openScoringDialog(student, module)}
			class="inline-flex items-center justify-center rounded border px-2 py-1 text-xs font-semibold transition-all
				{assess
				? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
				: 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}"
		>
			{assess?.score ?? 'Isi'}
		</button>
	{:else if module.scoringMode === 'CHECKLIST'}
		<button
			type="button"
			onclick={() => openScoringDialog(student, module)}
			class="inline-flex items-center justify-center rounded border px-2 py-1 text-xs font-semibold transition-all
				{assess
				? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
				: 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}"
		>
			{assess ? `${assess.score}%` : 'Isi'}
		</button>
	{/if}
{/snippet}

<!-- DIALOG FOR RUBRIK/CHECKLIST SCORING -->
<Dialog.Root bind:open={isScoringDialogOpen}>
	<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold text-slate-900">
				{activeModule?.name}
			</Dialog.Title>
			<Dialog.Description class="text-sm">
				<strong>{activeStudent?.name}</strong> ({activeStudent?.username})
			</Dialog.Description>
		</Dialog.Header>

		{#if activeModule}
			<div class="space-y-4 pt-2">
				<!-- Caption score legend if CHECKLIST -->
				{#if activeModule.scoringMode === 'CHECKLIST' && activeModule.scoreLegend}
					<div class="space-y-1 rounded-lg border bg-slate-50 p-3 text-[11px] text-slate-600">
						<p class="font-bold text-slate-700">Skala Penilaian:</p>
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
							{#each activeModule.scoreLegend as legend}
								<div><strong>{legend.value}</strong>: {legend.label}</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Criteria form list -->
				<div class="max-h-[350px] space-y-4 overflow-y-auto pr-1">
					{#if activeModule.scoringMode === 'CHECKLIST'}
						{#each dialogSections as sec}
							<div class="space-y-3">
								{#if sec.label}
									<h3
										class="rounded bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-700 uppercase"
									>
										{sec.label}
									</h3>
								{/if}
								{#each sec.items as crit}
									<div class="flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-2">
										<div class="flex items-start justify-between gap-4">
											<span class="text-xs leading-tight font-medium text-slate-800"
												>{crit.name}</span
											>
											<span class="shrink-0 text-xs font-semibold text-slate-400"
												>Max {crit.maxScore}</span
											>
										</div>
										{#if crit.maxScore === 2}
											<div class="flex gap-2">
												{#each [0, 1, 2] as val}
													<button
														type="button"
														class="flex-1 rounded border py-1 text-xs font-bold transition-all
															{criteriaValues[crit.id] === val
															? 'border-[#2D5A43] bg-[#2D5A43] text-white shadow-xs'
															: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}"
														onclick={() => (criteriaValues[crit.id] = val)}
													>
														{val}
													</button>
												{/each}
											</div>
										{:else}
											<div class="flex items-center gap-3">
												<input
													type="range"
													min="0"
													max={crit.maxScore}
													bind:value={criteriaValues[crit.id]}
													class="flex-1 accent-[#2D5A43]"
												/>
												<Input
													type="number"
													min="0"
													max={crit.maxScore}
													bind:value={criteriaValues[crit.id]}
													class="h-8 w-16 text-center"
												/>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/each}
					{:else}
						<!-- Flat list for RUBRIK -->
						{#each activeModule.criteria as crit}
							<div class="flex flex-col gap-2 rounded-lg border bg-white p-3">
								<div class="flex items-start justify-between gap-4">
									<div>
										<span class="block text-xs leading-tight font-semibold text-slate-900"
											>{crit.name}</span
										>
										{#if crit.description}
											<p class="mt-0.5 text-[10px] text-slate-400">{crit.description}</p>
										{/if}
									</div>
									<span class="shrink-0 text-xs font-semibold text-slate-400"
										>Max {crit.maxScore}</span
									>
								</div>
								<div class="mt-1 flex items-center gap-3">
									<input
										type="range"
										min="0"
										max={crit.maxScore}
										bind:value={criteriaValues[crit.id]}
										class="flex-1 accent-[#2D5A43]"
									/>
									<Input
										type="number"
										min="0"
										max={crit.maxScore}
										bind:value={criteriaValues[crit.id]}
										class="h-8 w-16 text-center"
									/>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Notes textarea -->
				<div class="space-y-1.5">
					<Label for="notes">Komentar / Catatan</Label>
					<Textarea
						id="notes"
						bind:value={notesValue}
						placeholder="Keterangan tambahan..."
						class="h-16 resize-none text-xs"
					/>
				</div>

				<!-- Live score readout -->
				<div
					class="flex items-center justify-between rounded-xl border border-[#2D5A43]/10 bg-[#2D5A43]/5 p-3"
				>
					<span class="text-xs font-bold text-slate-700 uppercase">Nilai Akhir:</span>
					<span class="text-2xl font-black text-[#2D5A43]">
						{activeModule.scoringMode === 'CHECKLIST' ? `${liveChecklistScore}%` : liveRubrikScore}
					</span>
				</div>

				<div>
					<Button
						type="button"
						variant="outline"
						disabled={isSubmittingDialog}
						onclick={() => (isScoringDialogOpen = false)}
					>
						Batal
					</Button>
					<Button
						type="button"
						disabled={isSubmittingDialog}
						onclick={submitDialogScore}
						class="bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						{isSubmittingDialog ? 'Menyimpan...' : 'Simpan Penilaian'}
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
