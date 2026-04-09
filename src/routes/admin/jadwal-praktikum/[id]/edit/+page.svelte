<script lang="ts">
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Search, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import * as Select from '$lib/components/ui/select';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	// Initial values from data.schedule
	const initialDate = new Date(data.schedule.startTime).toISOString().split('T')[0];
	const initialStartTime = new Date(data.schedule.startTime).toTimeString().slice(0, 5);
	const initialEndTime = new Date(data.schedule.endTime).toTimeString().slice(0, 5);
	const initialInstructorIds = data.schedule.instructors.map((i: any) => i.instructorId);
	const initialModuleIds = data.schedule.modules.map((m: any) => m.moduleId);

	// Form State
	let selectedType = $state(data.schedule.type);
	let selectedSeriesId = $state(data.schedule.seriesId || '');
	let semesterValue = $state(data.schedule.semester ? data.schedule.semester.toString() : '');
	let selectedClassId = $state(data.schedule.classId || '');
	let selectedLab = $state(data.schedule.laboratoriumId);
	let selectedBlock = $state(data.schedule.blockId || '');
	let selectedModules = $state<string[]>(initialModuleIds);
	let instructorSearch = $state('');
	let selectedInstructors = $state<string[]>(initialInstructorIds);

	const practicumTypes = [
		{ value: 'PRAKTIKUM', label: 'Praktikum' },
		{ value: 'OSCE', label: 'OSCE' },
		{ value: 'PELATIHAN', label: 'Pelatihan' }
	];

	const typeTriggerContent = $derived(
		practicumTypes.find((t) => t.value === selectedType)?.label ?? 'Pilih Jenis'
	);
	const seriesTriggerContent = $derived(
		data.series.find((s: any) => s.id === selectedSeriesId)?.name ?? 'Pilih Seri (Opsional)'
	);
	const classTriggerContent = $derived(
		data.classes.find((c: any) => c.id === selectedClassId)
			? `${data.classes.find((c: any) => c.id === selectedClassId).name} - Angkatan ${data.classes.find((c: any) => c.id === selectedClassId).batch}`
			: 'Pilih Kelas'
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

	function toggleInstructor(id: string) {
		if (selectedInstructors.includes(id)) {
			selectedInstructors = selectedInstructors.filter((i) => i !== id);
		} else {
			selectedInstructors = [...selectedInstructors, id];
		}
	}

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
			goto(`${base}/admin/jadwal-praktikum`);
		}
	}}
/>

<div class="flex h-full flex-col gap-6 p-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Edit Jadwal</h1>
		<p class="text-muted-foreground">Ubah detail jadwal kegiatan praktikum.</p>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			conflictError = null;
			return async ({ result }) => {
				if (result.type === 'success') {
					notificationType = 'success';
					notificationTitle = 'Berhasil!';
					notificationDescription = 'Jadwal praktikum telah berhasil diperbarui.';
					showNotification = true;
				} else if (result.type === 'failure') {
					if ((result.data as any)?.errorType === 'CONFLICT') {
						conflictError = (result.data as any)?.message;
					} else {
						notificationType = 'error';
						notificationTitle = 'Gagal!';
						notificationDescription =
							(result.data as any)?.message || 'Terjadi kesalahan saat memperbarui jadwal.';
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
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="seriesId">Seri Praktikum (Grup)</Label>
							<Select.Root type="single" name="seriesId" bind:value={selectedSeriesId}>
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
						</div>
						<div class="space-y-2">
							<Label for="semester">Semester</Label>
							<Input
								id="semester"
								name="semester"
								type="number"
								placeholder="Misal: 3"
								bind:value={semesterValue}
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="title">Judul Kegiatan / Aktivitas</Label>
						<Input
							id="title"
							name="title"
							value={data.schedule.title}
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
						<Label for="blockId">Blok (Opsional)</Label>
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
							<Input id="date" name="date" type="date" value={initialDate} required />
						</div>
						<div class="space-y-2">
							<Label for="startTime">Waktu Mulai</Label>
							<Input
								id="startTime"
								name="startTime"
								type="time"
								value={initialStartTime}
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="endTime">Waktu Selesai</Label>
							<Input id="endTime" name="endTime" type="time" value={initialEndTime} required />
						</div>
					</div>

					{#if conflictError}
						<p class="text-sm font-medium text-destructive">{conflictError}</p>
					{/if}

					<div class="space-y-2">
						<Label for="participantCount">Jumlah Peserta</Label>
						<Input
							id="participantCount"
							name="participantCount"
							type="number"
							min="1"
							value={data.schedule.participantCount}
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="notes">Catatan / Kebutuhan Khusus</Label>
						<textarea
							id="notes"
							name="notes"
							class="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="Tambahkan catatan jika ada..."
							value={data.schedule.notes || ''}
						></textarea>
					</div>
				</Card.Content>
			</Card.Root>

			<div class="flex justify-end gap-4">
				<Button variant="outline" href="{base}/admin/jadwal-praktikum">Batal</Button>
				<Button type="submit">Simpan Perubahan</Button>
			</div>
		</div>

		<div class="space-y-6">
			<Card.Root class="flex h-full max-h-[700px] flex-col">
				<Card.Header>
					<Card.Title>Instruktur</Card.Title>
					<Card.Description>Pilih satu atau lebih instruktur untuk jadwal ini.</Card.Description>
					<div class="relative mt-2">
						<Search class="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
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
						<label
							class="flex cursor-pointer items-center space-y-0 space-x-3 rounded-md border p-4 transition-colors hover:bg-accent"
						>
							<Checkbox
								id={instructor.id}
								name="instructorIds"
								value={instructor.id}
								checked={selectedInstructors.includes(instructor.id)}
								onCheckedChange={() => toggleInstructor(instructor.id)}
							/>
							<div class="flex flex-col gap-0.5">
								<span class="text-sm leading-none font-medium">
									{instructor.name}
								</span>
								<span class="text-xs text-muted-foreground">
									{instructor.email}
								</span>
							</div>
						</label>
					{:else}
						<p class="text-center text-sm text-muted-foreground py-8">
							Instruktur tidak ditemukan.
						</p>
					{/each}
				</Card.Content>
				<Card.Footer class="flex items-center justify-between border-t bg-muted/20 p-4">
					<span class="text-sm text-muted-foreground">
						{selectedInstructors.length} Instruktur dipilih
					</span>
					{#if selectedInstructors.length > 0}
						<Button variant="ghost" size="sm" onclick={() => (selectedInstructors = [])}>
							Reset
						</Button>
					{/if}
				</Card.Footer>
			</Card.Root>
		</div>
	</form>
</div>
