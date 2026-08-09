<script lang="ts">
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		Search,
		Calendar,
		Users,
		Layers,
		UserCheck,
		HelpCircle
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

	// Wizard Step State
	let currentStep = $state(1);

	// Notification & Guidance Dialog State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let showGuidanceDialog = $state(false);

	// Step 1 Form State
	let title = $state('');
	let selectedSeriesId = $state('');
	let selectedBatch = $state('');
	let selectedClassIds = $state<string[]>([]);
	let selectedLab = $state('');
	let selectedBlock = $state('');
	let selectedModules = $state<string[]>([]);
	let dateStr = $state('');
	let startTimeStr = $state('');
	let endTimeStr = $state('');

	// Step 2 Form State
	let selectedType = $state('PRAKTIKUM');
	let notes = $state('');
	let instructorSearch = $state('');
	let instructorGroupMap = $state<Record<string, string[]>>({});
	let expandedInstructorId = $state<string | null>(null);

	const selectedInstructorIds = $derived(Object.keys(instructorGroupMap));

	// Unique Batches dari daftar kelas
	const batches = $derived(
		[...new Set(data.classes.map((c: any) => c.batch))].sort(
			(a: any, b: any) => Number(b) - Number(a)
		)
	);

	function handleBatchChange(v: string) {
		selectedBatch = v;
		if (v) {
			const matchingClassIds = data.classes
				.filter((c: any) => c.batch.toString() === v)
				.map((c: any) => c.id);
			selectedClassIds = matchingClassIds;
		}
	}

	// Kelompok dari SELURUH kelas yang dipilih
	const groupsForClasses = $derived(
		data.groups.filter((g: any) => selectedClassIds.includes(g.classId))
	);

	// Total peserta dari seluruh kelas yang dipilih
	const participantCount = $derived(
		data.classes
			.filter((c: any) => selectedClassIds.includes(c.id))
			.reduce((sum: number, c: any) => sum + (c.members?.length ?? 0), 0)
	);

	// Union semua kelompok yang sudah dipakai DPJP MANAPUN
	function assignedElsewhere(instructorId: string): Set<string> {
		const used = new Set<string>();
		for (const [id, groupIds] of Object.entries(instructorGroupMap)) {
			if (id === instructorId) continue;
			for (const gid of groupIds) used.add(gid);
		}
		return used;
	}

	function toggleInstructor(id: string) {
		if (id in instructorGroupMap) {
			const next = { ...instructorGroupMap };
			delete next[id];
			instructorGroupMap = next;
			if (expandedInstructorId === id) expandedInstructorId = null;
		} else {
			instructorGroupMap = { ...instructorGroupMap, [id]: [] };
			expandedInstructorId = id;
		}
	}

	function toggleGroupForInstructor(instructorId: string, groupId: string) {
		const current = instructorGroupMap[instructorId] ?? [];
		const next = current.includes(groupId)
			? current.filter((g) => g !== groupId)
			: [...current, groupId];
		instructorGroupMap = { ...instructorGroupMap, [instructorId]: next };
	}

	// Kelompok kelas yang belum dipilih DPJP manapun
	const unassignedGroups = $derived(
		groupsForClasses.filter((g: any) => !Object.values(instructorGroupMap).flat().includes(g.id))
	);

	function autoDistributeGroups() {
		const instructorIds = selectedInstructorIds;
		if (instructorIds.length === 0 || unassignedGroups.length === 0) return;
		const next = { ...instructorGroupMap };
		unassignedGroups.forEach((g: any, idx: number) => {
			const targetId = instructorIds[idx % instructorIds.length];
			next[targetId] = [...(next[targetId] ?? []), g.id];
		});
		instructorGroupMap = next;
	}

	const hasUnassignedGroups = $derived(
		groupsForClasses.length > 0 && selectedInstructorIds.length > 0 && unassignedGroups.length > 0
	);

	const practicumTypes = [
		{ value: 'PRAKTIKUM', label: 'Praktikum' },
		{ value: 'OSCE', label: 'OSCE' },
		{ value: 'PELATIHAN', label: 'Pelatihan' }
	];

	const typeTriggerContent = $derived(
		practicumTypes.find((t) => t.value === selectedType)?.label ?? 'Pilih Jenis (Opsional)'
	);
	const seriesTriggerContent = $derived(
		data.series.find((s: any) => s.id === selectedSeriesId)?.name ?? 'Pilih Seri Praktikum'
	);
	const batchTriggerContent = $derived(
		selectedBatch ? `Angkatan ${selectedBatch}` : 'Pilih Angkatan (Otomatis Pilih Semua Kelas)'
	);
	const classTriggerContent = $derived(
		selectedClassIds.length > 0
			? `${selectedClassIds.length} Kelas Dipilih`
			: 'Pilih Kelas (Manual)'
	);
	const labTriggerContent = $derived(
		data.labs.find((l: any) => l.id === selectedLab)?.name ?? 'Pilih Laboratorium'
	);
	const blockTriggerContent = $derived(
		data.blocks.find((b: any) => b.id === selectedBlock)?.name ?? 'Pilih Blok'
	);

	const filteredModules = $derived(data.modules.filter((m: any) => m.blockId === selectedBlock));

	const moduleTriggerContent = $derived(
		selectedModules.length > 0 ? `${selectedModules.length} Modul dipilih` : 'Pilih Modul'
	);

	const filteredInstructors = $derived(
		data.instructors.filter((i: any) =>
			i.name.toLowerCase().includes(instructorSearch.toLowerCase())
		)
	);

	let conflictError = $state<string | null>(null);

	function validateAndGoStep2() {
		if (!title.trim()) {
			notificationType = 'error';
			notificationTitle = 'Data Belum Lengkap';
			notificationDescription = 'Judul kegiatan wajib diisi.';
			showNotification = true;
			return;
		}
		if (selectedClassIds.length === 0) {
			notificationType = 'error';
			notificationTitle = 'Data Belum Lengkap';
			notificationDescription = 'Pilih minimal satu kelas.';
			showNotification = true;
			return;
		}
		if (!selectedLab) {
			notificationType = 'error';
			notificationTitle = 'Data Belum Lengkap';
			notificationDescription = 'Laboratorium wajib dipilih.';
			showNotification = true;
			return;
		}
		if (!dateStr || !startTimeStr || !endTimeStr) {
			notificationType = 'error';
			notificationTitle = 'Data Belum Lengkap';
			notificationDescription = 'Tanggal dan waktu praktikum wajib diisi.';
			showNotification = true;
			return;
		}
		currentStep = 2;
	}
</script>

<!-- Notification Dialog -->
<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	onAction={() => {
		showNotification = false;
		if (notificationType === 'success') {
			goto(`/admin/jadwal-praktikum`);
		}
	}}
/>

<!-- Comprehensive Guidance Modal / Dialog with scrollbar-elegant -->
<Dialog.Root bind:open={showGuidanceDialog}>
	<Dialog.Content class="scrollbar-elegant max-h-[85vh] max-w-2xl overflow-y-auto p-6">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-xl font-bold text-[#2D5A43]">
				<HelpCircle class="h-5 w-5" />
				Panduan Pengisian Jadwal Praktikum
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-500">
				Alur langkah demi langkah untuk menambahkan jadwal kegiatan baru secara lengkap.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-5 py-3 text-sm text-slate-700">
			<div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
				<h4 class="flex items-center gap-2 font-bold text-[#2D5A43]">
					<span
						class="flex h-5 w-5 items-center justify-center rounded-full bg-[#2D5A43] text-xs text-white"
						>1</span
					>
					Langkah 1: Informasi Umum & Jadwal
				</h4>
				<ul class="list-disc space-y-1.5 pl-5 text-xs text-slate-600">
					<li>
						<strong>Seri Praktikum:</strong> Wajib dipilih jika jenis kegiatan adalah
						<em>Praktikum</em>. Digunakan untuk pengelompokan rekapitulasi nilai mahasiswa.
					</li>
					<li>
						<strong>Judul Kegiatan:</strong> Nama topik atau aktivitas praktikum (misal:
						<em>Caries Removal</em>).
					</li>
					<li>
						<strong>Angkatan & Kelas:</strong> Pilih angkatan untuk memilih semua kelas dalam angkatan
						tersebut secara otomatis, atau pilih kelas secara manual.
					</li>
					<li>
						<strong>Laboratorium:</strong> Ruangan laboratorium tempat praktikum dilaksanakan.
					</li>
					<li>
						<strong>Blok & Modul Praktikum:</strong> Blok mata kuliah dan modul acuan praktikum.
					</li>
					<li>
						<strong>Waktu & Tanggal:</strong> Tanggal pelaksanaan serta jam mulai dan jam selesai.
					</li>
				</ul>
			</div>

			<div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
				<h4 class="flex items-center gap-2 font-bold text-[#2D5A43]">
					<span
						class="flex h-5 w-5 items-center justify-center rounded-full bg-[#2D5A43] text-xs text-white"
						>2</span
					>
					Langkah 2: DPJP & Penugasan Kelompok
				</h4>
				<ul class="list-disc space-y-1.5 pl-5 text-xs text-slate-600">
					<li>
						<strong>Penugasan DPJP:</strong> Pilih dosen DPJP dan alokasikan kelompok mahasiswa. Nama
						kelas ditampilkan tepat di bawah nama kelompok.
					</li>
					<li>
						<strong>Jenis Kegiatan:</strong> Opsional (Praktikum, OSCE, atau Pelatihan). Jika
						memilih <em>Praktikum</em>, pastikan Seri Praktikum pada Langkah 1 telah terisi.
					</li>
					<li>
						<strong>Total Jumlah Peserta:</strong> Dihitung otomatis berdasarkan total mahasiswa terdaftar
						di kelas terpilih.
					</li>
					<li>
						<strong>Catatan / Kebutuhan Khusus:</strong> Kebutuhan alat khusus, ruangan, atau catatan
						pengingat.
					</li>
				</ul>
			</div>
		</div>

		<Dialog.Footer class="border-t pt-3">
			<Button
				onclick={() => (showGuidanceDialog = false)}
				class="bg-[#2D5A43] text-white hover:bg-[#234735]"
			>
				Mengerti & Tutup
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="scrollbar-elegant flex h-full flex-col gap-6 overflow-y-auto p-6">
	<!-- Responsive Stepper Header -->
	<div
		class="flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs sm:flex-row"
	>
		<!-- Step 1 Tab -->
		<button
			type="button"
			onclick={() => (currentStep = 1)}
			class="step-1-chevron relative flex flex-1 items-center justify-start gap-3 px-4 py-3 text-left transition-all sm:py-3.5 sm:pr-8 sm:pl-6 {currentStep ===
			1
				? 'bg-[#2D5A43] font-bold text-white'
				: currentStep > 1
					? 'bg-[#234735] font-medium text-white hover:bg-[#1e3b2c]'
					: 'bg-slate-100 font-medium text-slate-600 hover:bg-slate-200/60'}"
		>
			<div
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold {currentStep ===
					1 || currentStep > 1
					? 'bg-white text-[#2D5A43]'
					: 'bg-slate-300 text-slate-700'}"
			>
				{#if currentStep > 1}
					<Check class="h-4 w-4 text-[#2D5A43]" />
				{:else}
					1
				{/if}
			</div>
			<div class="flex flex-col">
				<span class="text-[10px] font-semibold tracking-wider uppercase opacity-80">Langkah 1</span>
				<span class="text-xs font-bold sm:text-sm">Informasi Umum & Jadwal</span>
			</div>
		</button>

		<!-- Step 2 Tab -->
		<button
			type="button"
			onclick={validateAndGoStep2}
			class="step-2-chevron relative flex flex-1 items-center justify-start gap-3 px-4 py-3 text-left transition-all sm:-ml-4 sm:py-3.5 sm:pr-6 sm:pl-8 {currentStep ===
			2
				? 'bg-[#2D5A43] font-bold text-white'
				: 'bg-slate-100 font-medium text-slate-600 hover:bg-slate-200/60'}"
		>
			<div
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold {currentStep ===
				2
					? 'bg-white text-[#2D5A43]'
					: 'bg-slate-300 text-slate-700'}"
			>
				2
			</div>
			<div class="flex flex-col">
				<span class="text-[10px] font-semibold tracking-wider uppercase opacity-80">Langkah 2</span>
				<span class="text-xs font-bold sm:text-sm">DPJP & Kelompok Mahasiswa</span>
			</div>
		</button>
	</div>

	<!-- Form Wizard Content -->
	<form
		method="POST"
		use:enhance={({ cancel }) => {
			if (selectedType === 'PRAKTIKUM' && !selectedSeriesId) {
				notificationType = 'error';
				notificationTitle = 'Data Belum Lengkap';
				notificationDescription = 'Seri Praktikum wajib dipilih untuk kegiatan Praktikum.';
				showNotification = true;
				currentStep = 1;
				cancel();
				return;
			}
			if (selectedInstructorIds.length === 0) {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = 'Pilih minimal satu DPJP.';
				showNotification = true;
				cancel();
				return;
			}
			if (hasUnassignedGroups) {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = 'Semua kelompok harus ditugaskan ke DPJP.';
				showNotification = true;
				cancel();
				return;
			}
			if (groupsForClasses.length > 0) {
				const instructorWithoutGroup = selectedInstructorIds.find(
					(id) => (instructorGroupMap[id] ?? []).length === 0
				);
				if (instructorWithoutGroup) {
					notificationType = 'error';
					notificationTitle = 'Gagal!';
					notificationDescription = 'Setiap DPJP yang dipilih harus ditugaskan minimal 1 kelompok.';
					showNotification = true;
					cancel();
					return;
				}
			}
			conflictError = null;
			return async ({ result }) => {
				if (result.type === 'success') {
					notificationType = 'success';
					notificationTitle = 'Berhasil!';
					notificationDescription = 'Jadwal praktikum telah berhasil ditambahkan.';
					showNotification = true;
				} else if (result.type === 'failure') {
					if ((result.data as any)?.errorType === 'CONFLICT') {
						conflictError = (result.data as any)?.message;
						currentStep = 1;
					} else {
						notificationType = 'error';
						notificationTitle = 'Gagal!';
						notificationDescription =
							(result.data as any)?.message || 'Terjadi kesalahan saat menambah jadwal.';
						showNotification = true;
					}
				}
			};
		}}
		class="space-y-6"
	>
		<!-- Explicit Hidden Form Inputs for Server Actions -->
		<input type="hidden" name="seriesId" value={selectedSeriesId} />
		<input type="hidden" name="type" value={selectedType} />
		<input type="hidden" name="labId" value={selectedLab} />
		<input type="hidden" name="blockId" value={selectedBlock} />

		{#each selectedClassIds as classId}
			<input type="hidden" name="classIds" value={classId} />
		{/each}
		{#each selectedModules as moduleId}
			<input type="hidden" name="moduleIds" value={moduleId} />
		{/each}
		{#each Object.entries(instructorGroupMap) as [instructorId, groupIds]}
			{#if groupIds.length > 0}
				{#each groupIds as groupId}
					<input type="hidden" name="assignments" value="{instructorId}:{groupId}" />
				{/each}
			{:else}
				<input type="hidden" name="assignments" value="{instructorId}:" />
			{/if}
		{/each}

		<!-- LANGKAH 1: INFORMASI UMUM -->
		{#if currentStep === 1}
			<Card.Root class="border-slate-200 shadow-sm">
				<Card.Header class="border-b bg-slate-50/50 pb-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 class="text-2xl font-bold tracking-tight text-slate-900">Tambah Jadwal</h1>
							<p class="text-sm text-slate-500">
								Buat jadwal kegiatan praktikum, OSCE, atau pelatihan baru.
							</p>
						</div>

						<!-- Guidance Button: full-width "Panduan" text on mobile, icon-only <HelpCircle /> on desktop -->
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => (showGuidanceDialog = true)}
							class="flex w-full items-center justify-center gap-1.5 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 sm:w-auto"
							title="Panduan Pengisian"
						>
							<HelpCircle class="h-4 w-4 text-[#2D5A43]" />
							<span class="font-medium sm:hidden">Panduan</span>
						</Button>
					</div>
				</Card.Header>

				<Card.Content class="space-y-5 ">
					<!-- Row 1: Seri Praktikum & Judul Kegiatan -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="seriesId">Seri Praktikum (Wajib jika Praktikum)</Label>
							<Select.Root
								type="single"
								bind:value={selectedSeriesId}
								onValueChange={(v) => {
									const seri = data.series.find((s: any) => s.id === v);
									if (seri) {
										selectedModules = [];
									}
								}}
							>
								<Select.Trigger class="w-full bg-white">
									{seriesTriggerContent}
								</Select.Trigger>
								<Select.Content class="scrollbar-elegant max-h-60 overflow-y-auto">
									<Select.Item value="" label="Tanpa Seri">Tanpa Seri</Select.Item>
									{#each data.series as s (s.id)}
										<Select.Item value={s.id} label={s.name}>
											{s.name}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label for="title">Judul Kegiatan <span class="text-red-500">*</span></Label>
							<Input
								id="title"
								name="title"
								bind:value={title}
								placeholder="Misal: Caries Removal atau Kelas I (SITE 1)"
								required
							/>
						</div>
					</div>

					<!-- Row 2: Select Angkatan & Select Kelas (Side-by-side) -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="batch">Angkatan</Label>
							<Select.Root
								type="single"
								bind:value={selectedBatch}
								onValueChange={handleBatchChange}
							>
								<Select.Trigger class="w-full bg-white">
									{batchTriggerContent}
								</Select.Trigger>
								<Select.Content class="scrollbar-elegant max-h-60 overflow-y-auto">
									<Select.Item value="" label="Pilih Angkatan">Pilih Angkatan</Select.Item>
									{#each batches as batch (batch)}
										<Select.Item value={batch.toString()} label="Angkatan {batch}">
											Angkatan {batch}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label for="classIds">Kelas <span class="text-red-500">*</span></Label>
							<SearchableSelect.Root type="multiple" bind:value={selectedClassIds}>
								<SearchableSelect.Trigger class="w-full bg-white">
									{classTriggerContent}
								</SearchableSelect.Trigger>
								<SearchableSelect.Content
									searchPlaceholder="Cari kelas..."
									class="scrollbar-elegant max-h-60 overflow-y-auto"
								>
									{#each data.classes as c (c.id)}
										<SearchableSelect.Item value={c.id} label="Kelas {c.name} ({c.batch})">
											<div class="flex flex-col">
												<span class="font-medium">Kelas {c.name}</span>
												<span class="text-xs text-muted-foreground">
													Angkatan {c.batch} ({c.academicYear}) • {c.members?.length ?? 0} Mhs
												</span>
											</div>
										</SearchableSelect.Item>
									{/each}
								</SearchableSelect.Content>
							</SearchableSelect.Root>
						</div>
					</div>

					<!-- Row 3: Laboratorium & Blok -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="labId">Laboratorium <span class="text-red-500">*</span></Label>
							<Select.Root type="single" bind:value={selectedLab}>
								<Select.Trigger class="w-full bg-white">
									{labTriggerContent}
								</Select.Trigger>
								<Select.Content class="scrollbar-elegant max-h-60 overflow-y-auto">
									{#each data.labs as lab (lab.id)}
										<Select.Item value={lab.id} label={lab.name}>
											{lab.name}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="space-y-2">
							<Label for="blockId">Blok</Label>
							<SearchableSelect.Root
								type="single"
								bind:value={selectedBlock}
								onValueChange={() => (selectedModules = [])}
							>
								<SearchableSelect.Trigger class="w-full bg-white">
									{blockTriggerContent}
								</SearchableSelect.Trigger>
								<SearchableSelect.Content
									searchPlaceholder="Cari blok..."
									class="scrollbar-elegant max-h-60 overflow-y-auto"
								>
									{#each data.blocks as block (block.id)}
										<SearchableSelect.Item value={block.id} label={block.name}>
											<div class="flex flex-col">
												<span>{block.name}</span>
												<span class="text-xs text-muted-foreground">{block.department.name}</span>
											</div>
										</SearchableSelect.Item>
									{/each}
								</SearchableSelect.Content>
							</SearchableSelect.Root>
						</div>
					</div>

					<!-- Row 4: Modul Praktikum -->
					<div class="space-y-2">
						<Label for="moduleIds">Modul Praktikum</Label>
						<SearchableSelect.Root
							type="multiple"
							bind:value={selectedModules}
							disabled={!selectedBlock}
						>
							<SearchableSelect.Trigger class="w-full bg-white">
								{moduleTriggerContent}
							</SearchableSelect.Trigger>
							<SearchableSelect.Content
								searchPlaceholder="Cari modul..."
								class="scrollbar-elegant max-h-60 overflow-y-auto"
							>
								{#if filteredModules.length > 0}
									{#each filteredModules as module (module.id)}
										<SearchableSelect.Item value={module.id} label={module.name}>
											{module.name}
										</SearchableSelect.Item>
									{/each}
								{:else}
									<div class="p-4 text-center text-sm text-muted-foreground italic">
										Tidak ada modul tersedia untuk blok ini.
									</div>
								{/if}
							</SearchableSelect.Content>
						</SearchableSelect.Root>
						{#if !selectedBlock}
							<p class="text-xs text-slate-500 italic">
								Pilih blok terlebih dahulu untuk memilih modul.
							</p>
						{/if}
					</div>

					<!-- Row 5: Waktu & Tanggal -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div class="space-y-2">
							<Label for="date">Tanggal <span class="text-red-500">*</span></Label>
							<Input id="date" name="date" type="date" bind:value={dateStr} required />
						</div>
						<div class="space-y-2">
							<Label for="startTime">Waktu Mulai <span class="text-red-500">*</span></Label>
							<Input
								id="startTime"
								name="startTime"
								type="time"
								bind:value={startTimeStr}
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="endTime">Waktu Selesai <span class="text-red-500">*</span></Label>
							<Input id="endTime" name="endTime" type="time" bind:value={endTimeStr} required />
						</div>
					</div>

					{#if conflictError}
						<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
							{conflictError}
						</div>
					{/if}
				</Card.Content>

				<!-- Step 1 Footer with Batal button right next to Lanjut -->
				<Card.Footer class="flex items-center justify-end gap-3 border-t bg-slate-50/50 p-4">
					<Button variant="outline" href="/admin/jadwal-praktikum">Batal</Button>
					<Button
						type="button"
						onclick={validateAndGoStep2}
						class="bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						Lanjut: DPJP & Kelompok
						<ArrowRight class="ml-1.5 h-4 w-4" />
					</Button>
				</Card.Footer>
			</Card.Root>

			<!-- LANGKAH 2: DPJP & KELOMPOK MAHASISWA -->
		{:else if currentStep === 2}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<!-- DPJP & Kelompok Assignment Card -->
				<div class="space-y-6 lg:col-span-2">
					<Card.Root class="border-slate-200 shadow-sm">
						<Card.Header class="border-b bg-slate-50/50 pb-4">
							<div class="flex items-center justify-between">
								<div class="space-y-1">
									<div class="flex items-center gap-2">
										<UserCheck class="h-5 w-5 text-[#2D5A43]" />
										<Card.Title class="text-lg">Penugasan DPJP & Kelompok</Card.Title>
									</div>
									<Card.Description>
										Pilih DPJP dan alokasikan kelompok mahasiswa dari kelas yang telah dipilih.
									</Card.Description>
								</div>
							</div>
							<div class="relative mt-3">
								<Search class="absolute top-3 left-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Cari nama DPJP..."
									class="bg-white pl-9"
									bind:value={instructorSearch}
								/>
							</div>
						</Card.Header>

						<Card.Content class="scrollbar-elegant  max-h-[500px] space-y-4 overflow-y-auto">
							{#each filteredInstructors as instructor (instructor.id)}
								<div class="rounded-lg border border-slate-200 bg-white transition-all">
									<label
										class="flex cursor-pointer items-center space-x-3 p-4 transition-colors hover:bg-slate-50"
									>
										<Checkbox
											id={instructor.id}
											checked={instructor.id in instructorGroupMap}
											onCheckedChange={() => toggleInstructor(instructor.id)}
										/>
										<div class="flex flex-1 flex-col gap-0.5">
											<span class="text-sm font-bold text-slate-800">{instructor.name}</span>
											<span class="text-xs text-slate-500">{instructor.email}</span>
										</div>
										{#if instructor.id in instructorGroupMap && groupsForClasses.length > 0}
											<span
												class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
											>
												{(instructorGroupMap[instructor.id] ?? []).length} kelompok
											</span>
										{/if}
									</label>

									{#if instructor.id in instructorGroupMap && groupsForClasses.length > 0}
										<div class="space-y-2 border-t border-slate-100 bg-slate-50/75 p-4">
											<p class="text-xs font-semibold text-slate-700">
												Kelompok yang ditangani {instructor.name}:
											</p>
											<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
												{#each groupsForClasses as group (group.id)}
													{@const isMine = (instructorGroupMap[instructor.id] ?? []).includes(
														group.id
													)}
													{@const isTakenByOther =
														!isMine && assignedElsewhere(instructor.id).has(group.id)}
													{#if !isTakenByOther}
														<label
															class="flex cursor-pointer items-center gap-2.5 rounded-md border bg-white p-2.5 transition-colors hover:border-slate-300"
														>
															<Checkbox
																checked={isMine}
																onCheckedChange={() =>
																	toggleGroupForInstructor(instructor.id, group.id)}
															/>
															<div class="flex flex-col text-left">
																<span class="text-xs font-bold text-slate-800">{group.name}</span>
																<span class="text-[11px] font-medium text-slate-500">
																	{group.class
																		? `Kelas ${group.class.name} (${group.class.batch})`
																		: 'Kelas -'}
																</span>
															</div>
														</label>
													{/if}
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{:else}
								<p class="py-8 text-center text-sm text-slate-400">DPJP tidak ditemukan.</p>
							{/each}
						</Card.Content>

						<Card.Footer class="flex flex-col items-stretch gap-3 border-t bg-slate-50/50 p-4">
							<div class="flex items-center justify-between text-sm">
								<span class="font-medium text-slate-600">
									{selectedInstructorIds.length} DPJP dipilih
								</span>
								{#if selectedInstructorIds.length > 0}
									<Button variant="ghost" size="sm" onclick={() => (instructorGroupMap = {})}>
										Reset Penugasan
									</Button>
								{/if}
							</div>
							{#if hasUnassignedGroups}
								<div
									class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
								>
									<p class="font-medium">
										{unassignedGroups.length} kelompok belum ditugaskan ke DPJP manapun.
									</p>
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="w-fit border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
										onclick={autoDistributeGroups}
									>
										Bagi Rata Otomatis
									</Button>
								</div>
							{/if}
						</Card.Footer>
					</Card.Root>
				</div>

				<!-- Participant Count & Notes Card (includes Jenis Kegiatan opsional) -->
				<div class="space-y-6 lg:col-span-1">
					<Card.Root class="border-slate-200 shadow-sm">
						<Card.Header class="border-b bg-slate-50/50 pb-4">
							<div class="flex items-center gap-2">
								<Users class="h-5 w-5 text-[#2D5A43]" />
								<Card.Title class="text-lg">Peserta & Catatan</Card.Title>
							</div>
							<Card.Description
								>Ringkasan jenis kegiatan, total mahasiswa, dan catatan.</Card.Description
							>
						</Card.Header>

						<Card.Content class="space-y-4 ">
							<!-- Jenis Kegiatan Opsional -->
							<div class="space-y-2">
								<Label for="type">Jenis Kegiatan (Opsional)</Label>
								<Select.Root type="single" bind:value={selectedType}>
									<Select.Trigger class="w-full bg-white">
										{typeTriggerContent}
									</Select.Trigger>
									<Select.Content class="scrollbar-elegant max-h-60 overflow-y-auto">
										{#each practicumTypes as type (type.value)}
											<Select.Item value={type.value} label={type.label}>
												{type.label}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<div class="space-y-2">
								<Label for="participantCount">Total Jumlah Peserta</Label>
								<Input
									id="participantCount"
									type="number"
									value={participantCount}
									disabled
									class="bg-slate-100 font-bold text-slate-900"
								/>
								<input type="hidden" name="participantCount" value={participantCount} />
							</div>

							<div class="space-y-2">
								<Label for="notes">Catatan / Kebutuhan Khusus</Label>
								<textarea
									id="notes"
									name="notes"
									bind:value={notes}
									class="scrollbar-elegant flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									placeholder="Tambahkan catatan kebutuhan alat, ruangan, atau pengingat..."
								></textarea>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Step 2 Actions -->
					<div class="flex flex-col gap-3">
						<Button
							type="submit"
							size="lg"
							class="w-full bg-[#2D5A43] text-white hover:bg-[#234735]"
						>
							<Check class="mr-1.5 h-4 w-4" />
							Simpan Jadwal
						</Button>
						<Button
							type="button"
							variant="outline"
							onclick={() => (currentStep = 1)}
							class="w-full"
						>
							<ArrowLeft class="mr-1.5 h-4 w-4" />
							Kembali ke Langkah 1
						</Button>
					</div>
				</div>
			</div>
		{/if}
	</form>
</div>

<style>
	@media (min-width: 640px) {
		.step-1-chevron {
			clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%);
		}
		.step-2-chevron {
			clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 16px 50%);
		}
	}
</style>
