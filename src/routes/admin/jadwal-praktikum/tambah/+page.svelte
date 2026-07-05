<script lang="ts">
	import { ArrowLeft, Check, Search } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	// Form State
	let selectedType = $state('PRAKTIKUM');
	let selectedSeriesId = $state('');
	let selectedClassId = $state('');
	let selectedLab = $state('');
	let selectedBlock = $state('');
	let selectedModules = $state<string[]>([]);
	let instructorSearch = $state('');
	let instructorGroupMap = $state<Record<string, string[]>>({});
	let expandedInstructorId = $state<string | null>(null);

	const selectedInstructorIds = $derived(Object.keys(instructorGroupMap));

	const groupsForClass = $derived(data.groups.filter((g: any) => g.classId === selectedClassId));

	// Union semua kelompok yang sudah dipakai instruktur MANAPUN
	function assignedElsewhere(instructorId: string): Set<string> {
		const used = new Set<string>();
		for (const [id, groupIds] of Object.entries(instructorGroupMap)) {
			if (id === instructorId) continue;
			for (const gid of groupIds) used.add(gid);
		}
		return used;
	}

	function availableGroupsFor(instructorId: string) {
		const used = assignedElsewhere(instructorId);
		return groupsForClass.filter((g: any) => !used.has(g.id));
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

	// Kelompok kelas yang belum dipilih instruktur manapun
	const unassignedGroups = $derived(
		groupsForClass.filter((g: any) => !Object.values(instructorGroupMap).flat().includes(g.id))
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
		groupsForClass.length > 0 && selectedInstructorIds.length > 0 && unassignedGroups.length > 0
	);

	const practicumTypes = [
		{ value: 'PRAKTIKUM', label: 'Praktikum' },
		{ value: 'OSCE', label: 'OSCE' },
		{ value: 'PELATIHAN', label: 'Pelatihan' }
	];

	const typeTriggerContent = $derived(
		practicumTypes.find((t) => t.value === selectedType)?.label ?? 'Pilih Jenis'
	);
	const seriesTriggerContent = $derived(
		data.series.find((s: any) => s.id === selectedSeriesId)?.name ?? 'Pilih Seri'
	);
	const selectedClass = $derived(data.classes.find((c: any) => c.id === selectedClassId));
	const participantCount = $derived(selectedClass?.members?.length ?? 0);

	const classTriggerContent = $derived(
		selectedClass ? `${selectedClass.name} - Angkatan ${selectedClass.batch}` : 'Pilih Kelas'
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
</script>

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

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Tambah Jadwal Baru</h1>
			<p class="text-muted-foreground">Buat jadwal kegiatan praktikum, OSCE, atau pelatihan.</p>
		</div>
	</div>

	<form
		method="POST"
		use:enhance={({ cancel }) => {
			if (selectedInstructorIds.length === 0) {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = 'Pilih minimal satu instruktur.';
				showNotification = true;
				cancel();
				return;
			}
			if (hasUnassignedGroups) {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = 'Semua kelompok harus ditugaskan ke instruktur.';
				showNotification = true;
				cancel();
				return;
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
		class="grid grid-cols-1 gap-6 lg:grid-cols-3"
	>
		<div class="space-y-6 lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Informasi Kegiatan</Card.Title>
					<Card.Description>Detail utama jadwal praktikum.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-1 gap-4">
						<div class="space-y-2">
							<Label for="seriesId">Seri Praktikum</Label>
							<Select.Root
								type="single"
								name="seriesId"
								bind:value={selectedSeriesId}
								onValueChange={(v) => {
									const seri = data.series.find((s: any) => s.id === v);
									if (seri) {
										if (seri.laboratoriumId) selectedLab = seri.laboratoriumId;
										if (seri.blockId) selectedBlock = seri.blockId;
										selectedModules = [];
									}
								}}
							>
								<Select.Trigger class="w-full">
									{seriesTriggerContent}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="" label="Tanpa Seri">Tanpa Seri</Select.Item>
									{#each data.series as s (s.id)}
										<Select.Item value={s.id} label={s.name}>
											{s.name}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<p class="text-[10px] text-muted-foreground italic">
								Gunakan seri untuk mengelompokkan jadwal dalam satu rekapitulasi (misal: "Clinical
								Skill Lab").
							</p>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="title">Judul Kegiatan / Aktivitas</Label>
						<Input
							id="title"
							name="title"
							placeholder="Misal: Caries Removal atau Kelas I (SITE 1)"
							required
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="type">Jenis Kegiatan</Label>
							<Select.Root type="single" name="type" bind:value={selectedType}>
								<Select.Trigger class="w-full">
									{typeTriggerContent}
								</Select.Trigger>
								<Select.Content>
									{#each practicumTypes as type (type.value)}
										<Select.Item value={type.value} label={type.label}>
											{type.label}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<div class="space-y-2">
							<Label for="classId">Angkatan & Kelas</Label>
							<SearchableSelect.Root type="single" bind:value={selectedClassId} required>
								<SearchableSelect.Trigger class="w-full">
									{classTriggerContent}
								</SearchableSelect.Trigger>
								<SearchableSelect.Content searchPlaceholder="Cari kelas...">
									{#each data.classes as c (c.id)}
										<SearchableSelect.Item value={c.id} label="{c.name} - Angkatan {c.batch}">
											<div class="flex flex-col">
												<span>Kelas {c.name}</span>
												<span class="text-xs text-muted-foreground"
													>Angkatan {c.batch} ({c.academicYear})</span
												>
											</div>
										</SearchableSelect.Item>
									{/each}
								</SearchableSelect.Content>
							</SearchableSelect.Root>
							<input type="hidden" name="classId" value={selectedClassId} />
						</div>
					</div>

					<div class="space-y-2">
						<Label for="labId">Laboratorium</Label>
						<Select.Root type="single" name="labId" bind:value={selectedLab}>
							<Select.Trigger class="w-full">
								{labTriggerContent}
							</Select.Trigger>
							<Select.Content>
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
							name="blockId"
							bind:value={selectedBlock}
							onValueChange={() => (selectedModules = [])}
						>
							<SearchableSelect.Trigger class="w-full">
								{blockTriggerContent}
							</SearchableSelect.Trigger>
							<SearchableSelect.Content searchPlaceholder="Cari blok...">
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

					<div class="space-y-2">
						<Label for="moduleIds">Modul Praktikum</Label>
						<SearchableSelect.Root
							type="multiple"
							bind:value={selectedModules}
							disabled={!selectedBlock}
						>
							<SearchableSelect.Trigger class="w-full">
								{moduleTriggerContent}
							</SearchableSelect.Trigger>
							<SearchableSelect.Content searchPlaceholder="Cari modul...">
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
						{#if !selectedBlock}
							<p class="text-xs text-muted-foreground italic">
								Pilih blok terlebih dahulu untuk melihat modul.
							</p>
						{:else if filteredModules.length === 0}
							<p class="text-xs text-destructive italic">
								Blok ini belum memiliki modul praktikum.
							</p>
						{/if}
					</div>

					<div class="grid grid-cols-3 gap-4">
						<div class="space-y-2">
							<Label for="date">Tanggal</Label>
							<Input id="date" name="date" type="date" required />
						</div>
						<div class="space-y-2">
							<Label for="startTime">Waktu Mulai</Label>
							<Input id="startTime" name="startTime" type="time" required />
						</div>
						<div class="space-y-2">
							<Label for="endTime">Waktu Selesai</Label>
							<Input id="endTime" name="endTime" type="time" required />
						</div>
					</div>

					{#if conflictError}
						<p class="text-sm font-medium text-destructive">{conflictError}</p>
					{/if}

					<div class="space-y-2">
						<Label for="participantCount">Jumlah Peserta</Label>
						<Input id="participantCount" type="number" value={participantCount} disabled />
						<input type="hidden" name="participantCount" value={participantCount} />
					</div>

					<div class="space-y-2">
						<Label for="notes">Catatan / Kebutuhan Khusus</Label>
						<textarea
							id="notes"
							name="notes"
							class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Tambahkan catatan jika ada..."
						></textarea>
					</div>
				</Card.Content>
			</Card.Root>

			<div class="flex justify-end gap-4">
				<Button variant="outline" href="/admin/jadwal-praktikum">Batal</Button>
				<Button type="submit">Simpan Jadwal</Button>
			</div>
		</div>

		<div class="space-y-6">
			<Card.Root class="flex h-full max-h-[700px] flex-col">
				<Card.Header>
					<Card.Title>Instruktur</Card.Title>
					<Card.Description>Pilih satu atau lebih instruktur untuk jadwal ini.</Card.Description>
					<div class="relative mt-2">
						<Search class="absolute top-3 left-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Cari nama instruktur..."
							class="pl-9"
							bind:value={instructorSearch}
						/>
					</div>
				</Card.Header>
				<Card.Content class="flex-1 space-y-4 overflow-y-auto">
					{#each filteredInstructors as instructor (instructor.id)}
						<div class="rounded-md border">
							<label
								class="flex cursor-pointer items-center space-y-0 space-x-3 p-4 transition-colors hover:bg-accent"
							>
								<Checkbox
									id={instructor.id}
									checked={instructor.id in instructorGroupMap}
									onCheckedChange={() => toggleInstructor(instructor.id)}
								/>
								<div class="flex flex-1 flex-col gap-0.5">
									<span class="text-sm leading-none font-medium">{instructor.name}</span>
									<span class="text-xs text-muted-foreground">{instructor.email}</span>
								</div>
								{#if instructor.id in instructorGroupMap && groupsForClass.length > 0}
									<span class="text-xs text-muted-foreground">
										{(instructorGroupMap[instructor.id] ?? []).length} kelompok
									</span>
								{/if}
							</label>

							{#if instructor.id in instructorGroupMap && groupsForClass.length > 0}
								<div class="space-y-2 border-t bg-muted/20 p-3">
									<p class="text-xs font-medium text-muted-foreground">
										Kelompok yang ditangani {instructor.name}:
									</p>
									{#each groupsForClass as group (group.id)}
										{@const isMine = (instructorGroupMap[instructor.id] ?? []).includes(group.id)}
										{@const isTakenByOther =
											!isMine && assignedElsewhere(instructor.id).has(group.id)}
										{#if !isTakenByOther}
											<label class="mt-1 flex cursor-pointer items-center gap-2 text-sm first:mt-0">
												<Checkbox
													checked={isMine}
													onCheckedChange={() => toggleGroupForInstructor(instructor.id, group.id)}
												/>
												{group.name}
											</label>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-center text-sm text-muted-foreground py-8">
							Instruktur tidak ditemukan.
						</p>
					{/each}
				</Card.Content>
				<Card.Footer class="flex flex-col items-stretch gap-2 border-t bg-muted/20 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">
							{selectedInstructorIds.length} Instruktur dipilih
						</span>
						{#if selectedInstructorIds.length > 0}
							<Button variant="ghost" size="sm" onclick={() => (instructorGroupMap = {})}
								>Reset</Button
							>
						{/if}
					</div>
					{#if hasUnassignedGroups}
						<div class="flex flex-col gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700">
							<span>{unassignedGroups.length} kelompok belum ditugaskan ke instruktur manapun.</span
							>
							<Button type="button" variant="outline" size="sm" onclick={autoDistributeGroups}>
								Bagi Rata Otomatis
							</Button>
						</div>
					{/if}
				</Card.Footer>
			</Card.Root>
		</div>
	</form>
</div>
