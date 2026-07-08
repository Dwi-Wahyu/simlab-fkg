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
	let eqp = $state(data.equipment || {});

	$effect(() => {
		item = data.item;
		eqp = data.equipment || {};
	});

	let isLoading = $state(false);

	// State untuk binding Select (Svelte 5 bind:value)
	let selectedCategory = $state(item.categoryId || '');
	let selectedEquipmentType = $state(item.equipmentType ?? '');
	let selectedUnit = $state(item.baseUnit);
	const isRestrictedLabUser = $derived(
		data.user?.role === 'kepalaLab' || data.user?.role === 'laboran'
	);
	let selectedLab = $state(
		isRestrictedLabUser && data.user?.laboratorium?.id
			? data.user.laboratorium.id
			: eqp.laboratoriumId || ''
	);
	let selectedCondition = $state(eqp.condition || 'BAIK');
	let selectedStatus = $state(eqp.status || 'READY');
	let createdAt = $state(
		eqp.createdAt
			? new Date(eqp.createdAt).toISOString().slice(0, 16)
			: new Date().toISOString().slice(0, 16)
	);

	$effect(() => {
		selectedCategory = item.categoryId || '';
		selectedEquipmentType = item.equipmentType ?? '';
		selectedUnit = item.baseUnit;
		if (isRestrictedLabUser && data.user?.laboratorium?.id) {
			selectedLab = data.user.laboratorium.id;
		} else {
			selectedLab = eqp.laboratoriumId || '';
		}
		selectedCondition = eqp.condition || 'BAIK';
		selectedStatus = eqp.status || 'READY';
		createdAt = eqp.createdAt
			? new Date(eqp.createdAt).toISOString().slice(0, 16)
			: new Date().toISOString().slice(0, 16);
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

	const equipmentTypeOptions = [
		{ value: 'FURNITURE', label: 'Mebel / Furniture' },
		{ value: 'INSTRUMENT', label: 'Instrumen' },
		{ value: 'EQUIPMENT', label: 'Alat / Perangkat' },
		{ value: 'DENTAL_UNIT', label: 'Dental Unit' },
		{ value: 'LAB_INSTRUMENT', label: 'Instrumen Lab' },
		{ value: 'IMAGING', label: 'Imaging' }
	];

	// Exclude BOTOL for Alat
	const unitOptions = [
		{ value: 'PCS', label: 'Pcs' },
		{ value: 'BOX', label: 'Box' },
		{ value: 'METER', label: 'Meter' },
		{ value: 'ROLL', label: 'Roll' },
		{ value: 'UNIT', label: 'Unit' }
	];

	const conditionOptions = [
		{ value: 'BAIK', label: 'Baik' },
		{ value: 'RUSAK', label: 'Rusak' }
	];

	const statusOptions = [
		{ value: 'READY', label: 'Ready' },
		{ value: 'IN_USE', label: 'In Use' },
		{ value: 'MAINTENANCE', label: 'Maintenance' }
	];

	// Derived trigger content
	const categoryTrigger = $derived(
		data.categories.find((o: any) => o.id === selectedCategory)?.name ?? 'Pilih Kategori'
	);
	const equipTrigger = $derived(
		equipmentTypeOptions.find((o) => o.value === selectedEquipmentType)?.label ?? 'Pilih Jenis'
	);
	const unitTrigger = $derived(
		unitOptions.find((o) => o.value === selectedUnit)?.label ?? 'Pilih Satuan'
	);
	const labTrigger = $derived(
		data.labs.find((o: any) => o.id === selectedLab)?.name ?? 'Pilih Laboratorium'
	);
	const conditionTrigger = $derived(
		conditionOptions.find((o) => o.value === selectedCondition)?.label ?? 'Pilih Kondisi'
	);
	const statusTrigger = $derived(
		statusOptions.find((o) => o.value === selectedStatus)?.label ?? 'Pilih Status'
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
			goto(`/admin/inventaris/alat`);
		}
	}

	$effect(() => {
		if (form?.success) {
			dialogConfig = {
				type: 'success',
				title: 'Berhasil!',
				description: 'Data alat telah berhasil diperbarui.',
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
			<h1 class="text-2xl font-bold text-slate-900">Edit Alat</h1>
			<p class="text-sm text-slate-500">Perbarui informasi alat dan spesifikasi fisiknya.</p>
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
				<input type="hidden" name="equipmentId" value={eqp.id || ''} />

				<!-- Nama Item -->
				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="name">Nama Alat</Label>
					<Input
						type="text"
						name="name"
						id="name"
						required
						value={item.name}
						placeholder="Contoh: Dental Unit X100"
					/>
				</div>

				<!-- Kategori Keluarga Alat (equipmentCategory) -->
				<div class="flex flex-col gap-2">
					<Label for="categoryId">Kategori Alat (Opsional)</Label>
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

				<!-- Jenis Alat -->
				<div class="flex flex-col gap-2">
					<Label for="equipmentType">Jenis Alat</Label>
					<Select.Root type="single" bind:value={selectedEquipmentType}>
						<Select.Trigger class="w-full text-left">
							{equipTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each equipmentTypeOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="equipmentType" value={selectedEquipmentType} />
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

				<!-- Laboratorium Penugasan -->
				<div class="flex flex-col gap-2">
					<Label for="laboratoriumId">Laboratorium Storing (Wajib)</Label>
					<Select.Root type="single" bind:value={selectedLab} disabled={isRestrictedLabUser}>
						<Select.Trigger class="w-full text-left">
							{labTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each data.labs as opt (opt.id)}
								<Select.Item value={opt.id} label={opt.name}>{opt.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="laboratoriumId" value={selectedLab} required />
				</div>

				<!-- Nomor Seri -->
				<div class="flex flex-col gap-2">
					<Label for="serialNumber">Nomor Seri (Opsional)</Label>
					<Input
						type="text"
						name="serialNumber"
						id="serialNumber"
						value={eqp.serialNumber || ''}
						placeholder="S/N: 123456"
					/>
				</div>

				<!-- Merk / Brand -->
				<div class="flex flex-col gap-2">
					<Label for="brand">Merk / Brand (Opsional)</Label>
					<Input
						type="text"
						name="brand"
						id="brand"
						value={eqp.brand || ''}
						placeholder="Contoh: Dentsply"
					/>
				</div>

				<!-- Tipe / Varian -->
				<div class="flex flex-col gap-2">
					<Label for="variant">Tipe / Varian (Opsional)</Label>
					<Input
						type="text"
						name="variant"
						id="variant"
						value={eqp.variant || ''}
						placeholder="Contoh: kanan, kiri"
					/>
				</div>

				<!-- Lokasi Penyimpanan -->
				<div class="flex flex-col gap-2">
					<Label for="storageLocation">Lokasi Penyimpanan (Opsional)</Label>
					<Input
						type="text"
						name="storageLocation"
						id="storageLocation"
						value={eqp.storageLocation || ''}
						placeholder="Contoh: Lemari A1"
					/>
				</div>

				<!-- Tanggal Ditambahkan -->
				<div class="flex flex-col gap-2">
					<Label for="createdAt">Tanggal Ditambahkan</Label>
					<Input
						type="datetime-local"
						name="createdAt"
						id="createdAt"
						bind:value={createdAt}
						required
					/>
				</div>

				<!-- Kondisi -->
				<div class="flex flex-col gap-2">
					<Label for="condition">Kondisi</Label>
					<Select.Root type="single" bind:value={selectedCondition}>
						<Select.Trigger class="w-full text-left">
							{conditionTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each conditionOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="condition" value={selectedCondition} />
				</div>

				<!-- Status -->
				<div class="flex flex-col gap-2">
					<Label for="status">Status</Label>
					<Select.Root type="single" bind:value={selectedStatus}>
						<Select.Trigger class="w-full text-left">
							{statusTrigger}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as opt (opt.value)}
								<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<input type="hidden" name="status" value={selectedStatus} />
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
						{isLoading ? 'Menyimpan...' : 'Perbarui Alat'}
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
