<script lang="ts">
	import {
		ArrowLeft,
		Calendar,
		CheckCircle2,
		ChevronLeft,
		ClipboardEdit,
		Info,
		MapPin,
		Save,
		User
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	let { data } = $props();

	// State
	let isSaving = $state<string | null>(null); // moduleId being saved
	let criteriaValues = $state<Record<string, number>>({});

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	$effect(() => {
		const values: Record<string, number> = {};
		for (const m of data.schedule.modules) {
			if (m.module.scoringMode === 'RUBRIK') {
				for (const crit of m.criteria) {
					const existingScore = data.criteriaScores.find((s: any) => s.criteriaId === crit.id);
					values[crit.id] = existingScore ? existingScore.score : 0;
				}
			}
		}
		criteriaValues = values;
	});

	function totalFor(moduleId: string, criteria: any[]) {
		if (criteria.length === 0) return 0;
		const sum = criteria.reduce((acc, crit) => acc + (criteriaValues[crit.id] || 0), 0);
		return Math.round(sum / criteria.length);
	}

	function getAssessment(moduleId: string) {
		return data.assessments.find((a: any) => a.moduleId === moduleId);
	}

	const modules = $derived(data.schedule.modules);

	function handleSave(moduleId: string) {
		return async ({ result }: { result: any }) => {
			isSaving = null;
			if (result.type === 'success') {
				notificationType = 'success';
				notificationTitle = 'Berhasil!';
				notificationDescription = 'Nilai telah disimpan.';
				showNotification = true;
			} else {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = result.data?.message || 'Terjadi kesalahan saat menyimpan nilai.';
				showNotification = true;
			}
		};
	}
</script>

<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	onAction={() => (showNotification = false)}
/>

<div class="flex h-full flex-col gap-4 p-4 md:p-6">
	<!-- Header Section -->
	<!-- <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon-sm" href="/admin/penilaian/{data.schedule.id}">
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<h1 class="text-2xl font-bold tracking-tight md:text-3xl">Catat Nilai</h1>
			</div>
			<p class="text-sm text-muted-foreground md:text-base">
				Berikan penilaian untuk mahasiswa pada modul-modul kegiatan ini.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				href="/admin/penilaian/{data.schedule.id}"
				class="hidden md:flex"
			>
				<ArrowLeft />
				Kembali ke Daftar
			</Button>
		</div>
	</div> -->

	<Button variant="outline" class="w-fit" href="/admin/penilaian/{data.schedule.id}">
		<ChevronLeft />
		Kembali
	</Button>

	<!-- Assessment Modules -->
	<div class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Daftar Modul / Kompetensi</h2>

		<div class="grid grid-cols-1 gap-6">
			{#each modules as m (m.moduleId)}
				{@const mod = m.module}
				{@const criteria = m.criteria}
				{@const assessment = getAssessment(mod.id)}
				{@const isOriginalInstructor =
					!assessment ||
					assessment.instructorId === data.user?.id ||
					data.user?.role === 'superadmin'}
				<Card.Root>
					<Card.Header class="border-b">
						<div class="flex items-start justify-between">
							<div class="space-y-1">
								<Card.Title class="text-lg md:text-xl">{mod.name}</Card.Title>
								{#if mod.description}
									<Card.Description>{mod.description}</Card.Description>
								{/if}
							</div>
						</div>
						{#if assessment}
							<div
								class={badgeVariants({ variant: 'outline' }) +
									' border-green-200 bg-green-50 text-green-700'}
							>
								<CheckCircle2 class="mr-1 h-3.5 w-3.5" />
								Sudah Dinilai
							</div>
						{:else}
							<div
								class={badgeVariants({ variant: 'outline' }) +
									' border-amber-200 bg-amber-50 text-amber-700'}
							>
								<Info class="mr-1 h-3.5 w-3.5" />
								Belum Dinilai
							</div>
						{/if}
					</Card.Header>
					<Card.Content>
						<form
							method="POST"
							action="?/saveAssessment"
							use:enhance={() => {
								isSaving = mod.id;
								return handleSave(mod.id);
							}}
							class="flex flex-col gap-6"
						>
							<input type="hidden" name="moduleId" value={mod.id} />

							<div class="flex flex-col gap-6">
								{#if mod.scoringMode === 'TOTAL'}
									<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
										<!-- Score Field -->
										<div class="space-y-2 md:col-span-1">
											<Label for="score-{mod.id}" class="text-sm font-semibold">Skor (0-100)</Label>
											<div class="relative">
												<Input
													id="score-{mod.id}"
													name="score"
													type="number"
													min="0"
													max="100"
													value={assessment?.score ?? ''}
													placeholder="0"
													class="h-12 text-lg font-bold"
													required
													disabled={!isOriginalInstructor}
												/>
											</div>
										</div>

										<!-- Notes Field -->
										<div class="space-y-2 md:col-span-3">
											<Label for="notes-{mod.id}" class="text-sm font-semibold"
												>Catatan / Feedback</Label
											>
											<Textarea
												id="notes-{mod.id}"
												name="notes"
												value={assessment?.notes ?? ''}
												placeholder="Masukkan catatan penilaian..."
												class="min-h-[80px] md:min-h-[100px]"
												disabled={!isOriginalInstructor}
											/>
										</div>
									</div>
								{:else}
									<!-- RUBRIK Mode Layout -->
									<div class="flex flex-col gap-4">
										<Label class="text-xs font-bold tracking-wider text-muted-foreground uppercase"
											>Kriteria Penilaian (Rubrik)</Label
										>
										<div class="space-y-4 rounded-xl border bg-muted/5 p-4">
											{#each criteria as criterion (criterion.id)}
												<div
													class="flex items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
												>
													<div class="flex flex-col">
														<span class="text-sm font-semibold">{criterion.name}</span>
														{#if criterion.description}
															<span class="text-xs text-muted-foreground"
																>{criterion.description}</span
															>
														{/if}
													</div>
													<div class="flex items-center gap-2">
														<Input
															type="number"
															name="criteriaScore_{criterion.id}"
															min="0"
															max={criterion.maxScore}
															class="w-24 text-right font-mono font-bold"
															bind:value={criteriaValues[criterion.id]}
															disabled={!isOriginalInstructor}
															required
														/>
														<span class="text-xs font-semibold text-muted-foreground"
															>/ {criterion.maxScore}</span
														>
													</div>
												</div>
											{/each}
											<div
												class="flex items-center justify-between border-t border-dashed pt-4 font-bold"
											>
												<span class="text-sm">Nilai Total Akhir (Otomatis)</span>
												<span class="text-lg text-primary">{totalFor(mod.id, criteria)}</span>
											</div>
										</div>

										<!-- Notes Field for RUBRIK -->
										<div class="mt-2 space-y-2">
											<Label for="notes-{mod.id}" class="text-sm font-semibold"
												>Catatan / Feedback</Label
											>
											<Textarea
												id="notes-{mod.id}"
												name="notes"
												value={assessment?.notes ?? ''}
												placeholder="Masukkan catatan penilaian..."
												class="min-h-[80px]"
												disabled={!isOriginalInstructor}
											/>
										</div>
									</div>
								{/if}
							</div>

							<!-- Previous Data Info -->
							{#if assessment}
								<div class="rounded-lg bg-muted/50 p-4 text-sm">
									<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
										<div class="flex items-center gap-2">
											<ClipboardEdit class="h-4 w-4 text-muted-foreground" />
											<span class="text-muted-foreground">Dinilai oleh:</span>
											<span class="font-semibold">{assessment.instructor?.name}</span>
										</div>

										<div class="text-xs text-muted-foreground">
											Diperbarui pada: {new Date(
												assessment.updatedAt || assessment.createdAt
											).toLocaleString('id-ID')}
										</div>
									</div>
								</div>
							{/if}

							<!-- Action -->
							<div class="flex justify-end">
								<Button
									type="submit"
									size="lg"
									class="w-full md:w-auto"
									disabled={isSaving === mod.id || !isOriginalInstructor}
								>
									{#if isSaving === mod.id}
										Menyimpan...
									{:else if !isOriginalInstructor}
										Terkunci
									{:else}
										<Save />
										{assessment ? 'Update Nilai' : 'Simpan Nilai'}
									{/if}
								</Button>
							</div>
						</form>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Info Cards -->
		<!-- <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<User class="h-6 w-6 text-primary" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs font-medium text-muted-foreground uppercase">Mahasiswa</span>
					<span class="font-bold">{data.student.name}</span>
					<span class="text-xs text-muted-foreground">{data.student.username}</span>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
					<Calendar class="h-6 w-6 text-amber-500" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs font-medium text-muted-foreground uppercase">Kegiatan</span>
					<span class="line-clamp-1 font-bold">{data.schedule.title}</span>
					<div class="flex gap-2">
						<span class="text-xs text-muted-foreground">Kelas {data.schedule.class}</span>
						<span class="text-xs text-muted-foreground">•</span>
						<span class="text-xs text-muted-foreground">{data.schedule.type}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2 lg:col-span-1">
			<Card.Content class="flex items-center gap-4">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
					<MapPin class="h-6 w-6 text-blue-500" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs font-medium text-muted-foreground uppercase">Laboratorium</span>
					<span class="font-bold">{data.schedule.laboratorium.name}</span>
					<span class="text-xs text-muted-foreground">FKG Universitas Hasanuddin</span>
				</div>
			</Card.Content>
		</Card.Root>
	</div> -->
	</div>
</div>
