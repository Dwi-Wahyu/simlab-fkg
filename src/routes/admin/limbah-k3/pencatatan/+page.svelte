<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Trash2, ArrowLeft, Save, Loader2 } from '@lucide/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let showDialog = $state(false);
	
	let dialogConfig = $derived.by(() => {
		if (form?.success) {
			return {
				type: 'success' as const,
				title: 'Berhasil',
				description: form.message || 'Data limbah berhasil dicatat.'
			};
		}
		return {
			type: 'error' as const,
			title: 'Gagal',
			description: form?.message || 'Terjadi kesalahan.'
		};
	});

	let selectedWasteType = $state('');
	let selectedLaboratorium = $state('');
	let selectedDisposalStatus = $state('STORED');

	const wasteTypes = [
		{ value: 'INFEKSIUS', label: 'Infeksius' },
		{ value: 'TAJAM', label: 'Benda Tajam' },
		{ value: 'KIMIA', label: 'Bahan Kimia' },
		{ value: 'RADIOAKTIF', label: 'Radioaktif' }
	];

	const disposalStatuses = [
		{ value: 'STORED', label: 'Disimpan' },
		{ value: 'COLLECTED_BY_THIRD_PARTY', label: 'Diambil Pihak Ketiga' },
		{ value: 'INCINERATED', label: 'Insinerasi' }
	];

	const wasteTypeTrigger = $derived(
		wasteTypes.find((t) => t.value === selectedWasteType)?.label ?? 'Pilih Jenis Limbah'
	);

	const labTrigger = $derived(
		data.laboratories.find((l) => l.id === selectedLaboratorium)?.name ?? 'Pilih Laboratorium'
	);

	const statusTrigger = $derived(
		disposalStatuses.find((s) => s.value === selectedDisposalStatus)?.label ?? 'Pilih Status'
	);

	$effect(() => {
		if (form) {
			showDialog = true;
		}
	});

	async function handleAction() {
		showDialog = false;
		if (form?.success) {
			await goto('/admin/limbah-k3');
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/admin/limbah-k3" title="Kembali">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">Catat Limbah Baru</h1>
			<p class="text-muted-foreground">Input detail limbah medis atau kimia untuk monitoring.</p>
		</div>
	</div>

	<div class="max-w-2xl">
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
					<Card.Title>Informasi Limbah</Card.Title>
					<Card.Description>Lengkapi detail limbah yang akan dicatat.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- Laboratorium -->
					<div class="grid gap-2">
						<Label for="laboratoriumId">Laboratorium</Label>
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

					<!-- Waste Type & Weight -->
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="grid gap-2">
							<Label for="wasteType">Jenis Limbah</Label>
							<Select.Root type="single" name="wasteType" bind:value={selectedWasteType}>
								<Select.Trigger class="w-full">
									{wasteTypeTrigger}
								</Select.Trigger>
								<Select.Content>
									{#each wasteTypes as type (type.value)}
										<Select.Item value={type.value} label={type.label}>{type.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="grid gap-2">
							<Label for="weightGram">Berat / Volume (gram)</Label>
							<Input
								type="number"
								id="weightGram"
								name="weightGram"
								placeholder="Misal: 500"
								required
								min="1"
							/>
						</div>
					</div>

					<!-- Disposal Status -->
					<div class="grid gap-2">
						<Label for="disposalStatus">Status Pembuangan</Label>
						<Select.Root type="single" name="disposalStatus" bind:value={selectedDisposalStatus}>
							<Select.Trigger class="w-full">
								{statusTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each disposalStatuses as status (status.value)}
									<Select.Item value={status.value} label={status.label}>{status.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Notes -->
					<div class="grid gap-2">
						<Label for="notes">Keterangan (Opsional)</Label>
						<Textarea
							id="notes"
							name="notes"
							placeholder="Catatan tambahan mengenai limbah ini..."
							rows={4}
						/>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2 border-t p-6">
					<Button variant="outline" href="/admin/limbah-k3" disabled={loading}>Batal</Button>
					<Button type="submit" disabled={loading}>
						{#if loading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Menyimpan...
						{:else}
							<Save class="mr-2 h-4 w-4" />
							Simpan Catatan
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
