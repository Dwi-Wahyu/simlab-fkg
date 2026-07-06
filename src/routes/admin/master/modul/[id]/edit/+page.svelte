<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronLeft, Loader2, Save, Plus, Trash2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data, form } = $props();

	let selectedBlockId = $state(data.module.blockId || '');
	let selectedComponent = $state(data.module.component || '');
	let selectedScoringMode = $state(data.module.scoringMode || 'TOTAL');
	let isLoading = $state(false);
	let showSuccessDialog = $state(false);

	interface Criterion {
		id: string;
		name: string;
		maxScore: number;
	}

	let criteriaList = $state<Criterion[]>(
		data.module.criteria && data.module.criteria.length > 0
			? data.module.criteria.map((c: any) => ({ id: c.id, name: c.name, maxScore: c.maxScore }))
			: [{ id: Math.random().toString(), name: '', maxScore: 100 }]
	);

	function addCriterion() {
		criteriaList.push({
			id: Math.random().toString(),
			name: '',
			maxScore: 100
		});
	}

	function removeCriterion(index: number) {
		const criterion = criteriaList[index];
		if (criterion.id && !criterion.id.startsWith('0.')) {
			const proceed = confirm(
				'Peringatan: Menghapus kriteria ini juga akan menghapus semua nilai mahasiswa yang terkait dengan kriteria ini. Apakah Anda yakin ingin melanjutkan?'
			);
			if (!proceed) return;
		}
		criteriaList.splice(index, 1);
	}

	const blockTrigger = $derived(
		data.blocks.find((b) => b.id === selectedBlockId)?.name ?? 'Pilih Blok'
	);

	const componentOptions = [
		{ value: '', label: 'Tanpa Komponen (Modul Umum)' },
		{ value: 'PREPARASI', label: 'Preparasi' },
		{ value: 'RESTORASI', label: 'Restorasi' }
	];

	const componentTrigger = $derived(
		componentOptions.find((o) => o.value === selectedComponent)?.label ?? 'Pilih Komponen'
	);

	const scoringModeOptions = [
		{ value: 'TOTAL', label: 'Total' },
		{ value: 'RUBRIK', label: 'Rubrik' }
	];

	const scoringModeTrigger = $derived(
		scoringModeOptions.find((o) => o.value === selectedScoringMode)?.label ?? 'Pilih Mode Penilaian'
	);

	$effect(() => {
		if (form?.success) {
			showSuccessDialog = true;
		}
	});

	function handleSuccessAction() {
		showSuccessDialog = false;
		goto(`/admin/master/modul`);
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="mx-auto w-full max-w-2xl space-y-6">
		<div class="flex items-center gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-3xl font-bold tracking-tight">Edit Modul Praktikum</h1>
				<p class="text-muted-foreground">Perbarui informasi modul praktikum.</p>
			</div>
		</div>

		<Card.Root mobileAware={true}>
			<form
				method="POST"
				use:enhance={() => {
					isLoading = true;
					return async ({ result }) => {
						isLoading = false;
						if (result.type === 'success') {
							showSuccessDialog = true;
						}
					};
				}}
			>
				<Card.Content class="space-y-4">
					<div class="grid gap-2">
						<Label for="name">Nama Modul</Label>
						<Input
							id="name"
							name="name"
							value={data.module.name}
							placeholder="Misal: Modul Sterilisasi Alat"
							required
						/>
					</div>

					<div class="grid gap-2">
						<Label for="block">Blok</Label>
						<Select.Root type="single" name="blockId" bind:value={selectedBlockId} required>
							<Select.Trigger class="w-full text-left">
								{blockTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each data.blocks as block (block.id)}
									<Select.Item value={block.id} label={block.name}>
										<div class="flex flex-col">
											<span>{block.name}</span>
											<span class="text-xs text-muted-foreground">{block.departmentName}</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="blockId" value={selectedBlockId} />
					</div>

					<div class="grid gap-2">
						<Label for="component">Komponen Penilaian</Label>
						<Select.Root type="single" name="component" bind:value={selectedComponent}>
							<Select.Trigger class="w-full text-left">
								{componentTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each componentOptions as opt (opt.value)}
									<Select.Item value={opt.value} label={opt.label}>
										{opt.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="component" value={selectedComponent} />
						<p class="text-xs text-muted-foreground">
							<i>Pilih Preparasi/Restorasi jika modul ini merepresentasikan salah satu tahap penilaian pada suatu jadwal. Biarkan kosong untuk modul dengan nilai tunggal (tanpa pemisahan).</i>
						</p>
					</div>

					<div class="grid gap-2">
						<Label for="scoringMode">Mode Penilaian</Label>
						<Select.Root type="single" name="scoringMode" bind:value={selectedScoringMode}>
							<Select.Trigger class="w-full text-left">
								{scoringModeTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each scoringModeOptions as opt (opt.value)}
									<Select.Item value={opt.value} label={opt.label}>
										{opt.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="scoringMode" value={selectedScoringMode} />
						<p class="text-xs text-muted-foreground">
							<i>Total: DPJP mengisi satu nilai akhir langsung. Rubrik: nilai akhir dihitung otomatis dari beberapa kriteria/tugas di bawah.</i>
						</p>
					</div>

					{#if selectedScoringMode === 'RUBRIK'}
						<div class="space-y-4 border-t pt-4">
							<div class="flex items-center justify-between">
								<h3 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Kriteria Rubrik</h3>
								<Button type="button" variant="outline" size="sm" onclick={addCriterion}>
									<Plus class="mr-2 h-4 w-4" />
									Tambah Kriteria
								</Button>
							</div>

							{#each criteriaList as criterion, idx (criterion.id)}
								<div class="flex flex-col gap-2 rounded-lg border p-4 bg-muted/10 relative">
									<div class="flex items-start gap-4">
										<!-- Hidden input to submit the criterion ID if it exists -->
										<input type="hidden" name="criteriaId[]" value={criterion.id.startsWith('0.') ? '' : criterion.id} />
										<div class="flex-1 grid gap-2">
											<Label for="criteria-name-{idx}">Nama Kriteria / Tugas</Label>
											<Input
												id="criteria-name-{idx}"
												name="criteriaName[]"
												placeholder="Misal: Ketepatan preparasi kavitas"
												bind:value={criterion.name}
												required
											/>
										</div>
										<div class="w-28 grid gap-2">
											<Label for="criteria-score-{idx}">Skor Maks</Label>
											<Input
												id="criteria-score-{idx}"
												type="number"
												name="criteriaMaxScore[]"
												min="1"
												bind:value={criterion.maxScore}
												required
											/>
										</div>
										{#if criteriaList.length > 1}
											<Button
												type="button"
												variant="ghost"
												size="icon"
												class="mt-8 text-destructive hover:bg-destructive/10 animate-fade-in"
												onclick={() => removeCriterion(idx)}
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								</div>
							{/each}

							<div class="rounded-lg bg-blue-50/50 border border-blue-100 p-4 text-xs text-blue-800">
								<p class="font-semibold mb-1">Catatan Pengaturan Skor:</p>
								<p>Sistem akan menghitung nilai total akhir sebagai rata-rata (jumlah skor dibagi dengan jumlah kriteria/tugas), dibulatkan ke bilangan bulat terdekat. Sangat disarankan untuk mengatur nilai maksimum setiap kriteria ke 100 agar konsisten.</p>
							</div>
						</div>
					{/if}

					<div class="grid gap-2">
						<Label for="description">Deskripsi (Opsional)</Label>
						<Textarea
							id="description"
							name="description"
							value={data.module.description ?? ''}
							placeholder="Jelaskan detail modul di sini..."
							rows={4}
						/>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2 pt-4">
					<Button variant="outline" href="/admin/master/modul" disabled={isLoading}>Batal</Button>
					<Button type="submit" disabled={isLoading}>
						{#if isLoading}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Menyimpan...
						{:else}
							<Save class="mr-2 size-4" />
							Simpan Perubahan
						{/if}
					</Button>
				</Card.Footer>
			</form>
		</Card.Root>
	</div>
</div>

<NotificationDialog
	bind:open={showSuccessDialog}
	type="success"
	title="Berhasil!"
	description="Modul praktikum telah berhasil diperbarui."
	actionLabel="Ke Daftar Modul"
	onAction={handleSuccessAction}
/>
