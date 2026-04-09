<script lang="ts">
	import { base } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { ShieldAlert, ArrowLeft, Save, Loader2 } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let showDialog = $state(false);
	
	let dialogConfig = $derived.by(() => {
		if (form?.success) {
			return {
				type: 'success' as const,
				title: 'Berhasil',
				description: form.message || 'Laporan insiden berhasil disimpan.'
			};
		}
		return {
			type: 'error' as const,
			title: 'Gagal',
			description: form?.message || 'Terjadi kesalahan.'
		};
	});

	let selectedLaboratorium = $state('');
	let selectedSeverity = $state('');
	let selectedStatus = $state('REPORTED');

	const severities = [
		{ value: 'LOW', label: 'Rendah (Minor)' },
		{ value: 'MEDIUM', label: 'Sedang (Moderate)' },
		{ value: 'HIGH', label: 'Tinggi (Major)' }
	];

	const statuses = [
		{ value: 'REPORTED', label: 'Dilaporkan' },
		{ value: 'INVESTIGATING', label: 'Investigasi' },
		{ value: 'ACTION_PLAN', label: 'Rencana Tindakan' },
		{ value: 'MONITORING', label: 'Pemantauan' },
		{ value: 'CLOSED', label: 'Selesai' }
	];

	const labTrigger = $derived(
		data.laboratories.find((l) => l.id === selectedLaboratorium)?.name ?? 'Pilih Laboratorium'
	);

	const severityTrigger = $derived(
		severities.find((s) => s.value === selectedSeverity)?.label ?? 'Pilih Tingkat Keparahan'
	);

	const statusTrigger = $derived(
		statuses.find((s) => s.value === selectedStatus)?.label ?? 'Pilih Status'
	);

	$effect(() => {
		if (form) {
			showDialog = true;
		}
	});

	async function handleAction() {
		showDialog = false;
		if (form?.success) {
			await goto(`${base}/admin/limbah-k3`);
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="{base}/admin/limbah-k3" title="Kembali">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">Laporkan Insiden K3</h1>
			<p class="text-muted-foreground">Catat insiden keselamatan kerja dan rencana tindak lanjut (CAPA).</p>
		</div>
	</div>

	<div class="max-w-3xl">
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			<Card.Root>
				<Card.Header>
					<Card.Title>Detail Insiden</Card.Title>
					<Card.Description>Informasi mengenai kejadian dan penanganan awal.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid gap-4 md:grid-cols-2">
						<!-- Laboratorium -->
						<div class="grid gap-2">
							<Label for="laboratoriumId">Laboratorium <span class="text-destructive">*</span></Label>
							<Select.Root type="single" name="laboratoriumId" bind:value={selectedLaboratorium}>
								<Select.Trigger class="w-full">
									{labTrigger}
								</Select.Trigger>
								<Select.Content>
									{#each data.laboratories as lab (lab.id)}
										<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Tanggal Insiden -->
						<div class="grid gap-2">
							<Label for="incidentDate">Tanggal Kejadian <span class="text-destructive">*</span></Label>
							<Input type="date" id="incidentDate" name="incidentDate" required />
						</div>
					</div>

					<!-- Judul Insiden -->
					<div class="grid gap-2">
						<Label for="title">Judul Insiden <span class="text-destructive">*</span></Label>
						<Input id="title" name="title" placeholder="Misal: Tumpahan Bahan Kimia di Area Sterilisasi" required />
					</div>

					<!-- Deskripsi -->
					<div class="grid gap-2">
						<Label for="description">Deskripsi Kejadian</Label>
						<Textarea id="description" name="description" placeholder="Jelaskan kronologi kejadian secara detail..." rows={4} />
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<!-- Tingkat Keparahan -->
						<div class="grid gap-2">
							<Label for="severity">Tingkat Keparahan <span class="text-destructive">*</span></Label>
							<Select.Root type="single" name="severity" bind:value={selectedSeverity}>
								<Select.Trigger class="w-full">
									{severityTrigger}
								</Select.Trigger>
								<Select.Content>
									{#each severities as s (s.value)}
										<Select.Item value={s.value} label={s.label}>{s.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Pelapor -->
						<div class="grid gap-2">
							<Label for="reporterName">Nama Pelapor / Saksi</Label>
							<Input id="reporterName" name="reporterName" placeholder="Nama lengkap pelapor" />
						</div>
					</div>

					<hr class="my-4" />

					<div class="grid gap-4 md:grid-cols-2">
						<!-- Status -->
						<div class="grid gap-2">
							<Label for="status">Status Penanganan <span class="text-destructive">*</span></Label>
							<Select.Root type="single" name="status" bind:value={selectedStatus}>
								<Select.Trigger class="w-full">
									{statusTrigger}
								</Select.Trigger>
								<Select.Content>
									{#each statuses as st (st.value)}
										<Select.Item value={st.value} label={st.label}>{st.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- CAPA -->
						<div class="grid gap-2">
							<Label for="capa">Tindakan Korektif & Preventif (CAPA)</Label>
							<Input id="capa" name="capa" placeholder="Rencana tindakan pencegahan" />
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2 border-t p-6">
					<Button variant="outline" href="{base}/admin/limbah-k3" disabled={loading}>Batal</Button>
					<Button type="submit" disabled={loading}>
						{#if loading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Menyimpan...
						{:else}
							<Save class="mr-2 h-4 w-4" />
							Simpan Laporan
						{/if}
					</Button>
				</Card.Footer>
			</Card.Root>
		</form>
	</div>
</div>

<NotificationDialog
	bind:open={showDialog}
	type={dialogConfig.type}
	title={dialogConfig.title}
	description={dialogConfig.description}
	onAction={handleAction}
/>
