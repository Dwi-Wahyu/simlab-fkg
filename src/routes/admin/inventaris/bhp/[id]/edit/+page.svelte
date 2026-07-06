<script lang="ts">
	import { ArrowLeft, Upload, X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data, form } = $props();

	let item = $state(data.item);
	$effect(() => {
		item = data.item;
	});

	let isLoading = $state(false);

	// State untuk binding Select (Svelte 5 bind:value)
	let selectedCategory = $state(item.categoryId || '');
	let selectedUnit = $state(item.baseUnit);

	$effect(() => {
		selectedCategory = item.categoryId || '';
		selectedUnit = item.baseUnit;
	});

	let qrCodePreview = $state<string | null>(item.qrCodePath);
	$effect(() => {
		qrCodePreview = item.qrCodePath;
	});
	let removeCurrentQr = $state(false);

	// State untuk NotificationDialog
	let showDialog = $state(false);
	let dialogConfig = $state({
		type: 'success' as 'success' | 'error' | 'info',
		title: '',
		description: '',
		actionLabel: 'Tutup'
	});

	// Include BOTOL for BHP
	const unitOptions = [
		{ value: 'PCS', label: 'Pcs' },
		{ value: 'BOX', label: 'Box' },
		{ value: 'METER', label: 'Meter' },
		{ value: 'ROLL', label: 'Roll' },
		{ value: 'UNIT', label: 'Unit' },
		{ value: 'BOTOL', label: 'Botol' }
	];

	// Derived trigger content
	const categoryTrigger = $derived(
		data.categories.find((o: any) => o.id === selectedCategory)?.name ?? 'Pilih Kategori'
	);
	const unitTrigger = $derived(
		unitOptions.find((o) => o.value === selectedUnit)?.label ?? 'Pilih Satuan'
	);

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				dialogConfig = {
					type: 'error',
					title: 'File Terlalu Besar',
					description: 'Ukuran file QR Code maksimal adalah 5MB.',
					actionLabel: 'Paham'
				};
				showDialog = true;
				input.value = '';
				return;
			}
			const reader = new FileReader();
			reader.onload = (e) => {
				qrCodePreview = e.target?.result as string;
				removeCurrentQr = false;
			};
			reader.readAsDataURL(file);
		}
	}

	function removeQrCode() {
		qrCodePreview = null;
		removeCurrentQr = true;
		const input = document.getElementById('qrCode') as HTMLInputElement;
		if (input) input.value = '';
	}

	function handleDialogAction() {
		showDialog = false;
		if (dialogConfig.type === 'success') {
			goto(`/admin/inventaris/bhp`);
		}
	}

	$effect(() => {
		if (form?.success) {
			dialogConfig = {
				type: 'success',
				title: 'Berhasil!',
				description: 'Data bahan habis pakai telah berhasil diperbarui.',
				actionLabel: 'Ke Inventori'
			};
			showDialog = true;
		} else if (form?.message) {
			dialogConfig = {
				type: 'error',
				title: 'Gagal Memperbarui',
				description: form.message,
				actionLabel: 'Coba Lagi'
			};
			showDialog = true;
		}
	});
</script>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" onclick={() => history.back()}>
			<ArrowLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Edit Bahan Habis Pakai</h1>
			<p class="text-sm text-slate-500">Perbarui informasi bahan habis pakai (BHP).</p>
		</div>
	</div>

	<Card.Root>
		<Card.Content>
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						isLoading = false;
						update();
					};
				}}
				class="grid grid-cols-1 gap-6 md:grid-cols-2"
			>
				<input type="hidden" name="removeCurrentQr" value={removeCurrentQr} />

				<!-- Nama Item -->
				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="name">Nama Bahan (BHP)</Label>
					<Input
						type="text"
						name="name"
						id="name"
						required
						value={item.name}
						placeholder="Contoh: Alkohol 70%"
					/>
				</div>

				<!-- Kategori Keluarga (equipmentCategory) -->
				<div class="flex flex-col gap-2">
					<Label for="categoryId">Kategori (Opsional)</Label>
					<Select.Root type="single" bind:value={selectedCategory}>
						<Select.Trigger class="w-full text-left">
							{categoryTrigger}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="" label="Tanpa Kategori">Tanpa Kategori</Select.Item>
							{#each data.categories as opt (opt.id)}
								<Select.Item value={opt.id} label={opt.name}>{opt.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="categoryId" value={selectedCategory} />
				</div>

				<!-- Satuan Dasar -->
				<div class="flex flex-col gap-2">
					<Label for="baseUnit">Satuan Dasar</Label>
					<Select.Root type="single" bind:value={selectedUnit}>
						<Select.Trigger class="w-full text-left">
							{unitTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each unitOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="baseUnit" value={selectedUnit} />
				</div>

				<!-- Stok Minimum -->
				<div class="flex flex-col gap-2">
					<Label for="minStock">Stok Minimum</Label>
					<Input
						type="number"
						name="minStock"
						id="minStock"
						min="0"
						value={item.minStock}
						placeholder="0"
					/>
				</div>

				<!-- QR Code Upload -->
				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="qrCode">Kode QR (Opsional)</Label>
					<div
						class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 transition hover:border-[#2D5A43]"
					>
						{#if qrCodePreview}
							<div class="relative">
								<img src={qrCodePreview} alt="Preview" class="max-h-48 rounded-lg shadow-sm" />
								<Button
									variant="destructive"
									size="icon"
									type="button"
									class="absolute -top-2 -right-2 size-6 rounded-full"
									onclick={removeQrCode}
								>
									<X class="size-4" />
								</Button>
							</div>
						{:else}
							<label for="qrCode" class="flex cursor-pointer flex-col items-center gap-2">
								<div class="rounded-full bg-slate-50 p-4">
									<Upload class="size-8 text-slate-400" />
								</div>
								<div class="text-center">
									<p class="text-sm font-medium text-slate-700">
										Klik untuk upload atau drag and drop
									</p>
									<p class="text-xs text-slate-500">PNG, JPG up to 5MB</p>
								</div>
								<input
									type="file"
									name="qrCode"
									id="qrCode"
									class="hidden"
									accept=".png,.jpg,.jpeg"
									onchange={handleFileChange}
								/>
							</label>
						{/if}
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="description">Deskripsi</Label>
					<Textarea
						name="description"
						id="description"
						value={item.description}
						placeholder="Tambahkan catatan singkat..."
						class="min-h-24"
					/>
				</div>

				<!-- Buttons -->
				<div class="mt-4 flex gap-3 md:col-span-2">
					<Button variant="outline" class="flex-1" onclick={() => history.back()}>Batal</Button>
					<Button
						type="submit"
						disabled={isLoading}
						class="flex-1 bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						{isLoading ? 'Menyimpan...' : 'Perbarui BHP'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>

<NotificationDialog
	bind:open={showDialog}
	type={dialogConfig.type}
	title={dialogConfig.title}
	description={dialogConfig.description}
	actionLabel={dialogConfig.actionLabel}
	onAction={handleDialogAction}
/>
