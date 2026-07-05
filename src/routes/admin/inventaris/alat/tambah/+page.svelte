<script lang="ts">
	import { ChevronLeft, Search, Upload, X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data, form } = $props();

	let isLoading = $state(false);

	// State untuk form fields agar bisa di-prefill
	let name = $state('');
	let brand = $state('');
	let variant = $state('');
	let storageLocation = $state('');
	let description = $state('');

	// State untuk binding Select (Svelte 5 bind:value)
	let selectedCategory = $state(''); // Kategori alat (equipmentCategory)
	let selectedEquipmentType = $state(''); // Jenis Alat
	let selectedUnit = $state('UNIT'); // Satuan Dasar
	let selectedLab = $state(''); // Laboratorium
	let selectedCondition = $state('BAIK'); // Kondisi
	let selectedStatus = $state('READY'); // Status

	// State untuk Dialog Pencarian Aset
	let isDialogOpen = $state(false);
	let assetSearchQuery = $state('');
	let selectedAssetId = $state<string | null>(null);

	const filteredAssets = $derived(
		data.existingAssets.filter((asset: any) =>
			asset.name.toLowerCase().includes(assetSearchQuery.toLowerCase())
		)
	);

	function selectAsset(asset: any) {
		name = asset.name;
		selectedCategory = asset.categoryId || '';
		selectedEquipmentType = asset.equipmentType || '';
		description = asset.description || '';

		const firstEqp = asset.equipments?.[0];
		if (firstEqp) {
			brand = firstEqp.brand || '';
			variant = firstEqp.variant || '';
			storageLocation = firstEqp.storageLocation || '';
			selectedLab = firstEqp.laboratoriumId || '';
			selectedCondition = firstEqp.condition || 'BAIK';
			selectedStatus = firstEqp.status || 'READY';
		}

		selectedAssetId = asset.id;
		isDialogOpen = false;
	}

	function clearAssetSelection() {
		selectedAssetId = null;
		name = '';
		brand = '';
		variant = '';
		storageLocation = '';
		description = '';
	}

	let qrCodePreview = $state<string | null>(null);

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
		data.categories.find((o: any) => o.id === selectedCategory)?.name ?? 'Pilih Kategori Kategori'
	);
	const equipTrigger = $derived(
		equipmentTypeOptions.find((o) => o.value === selectedEquipmentType)?.label ?? 'Pilih Jenis Alat'
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
			};
			reader.readAsDataURL(file);
		}
	}

	function removeQrCode() {
		qrCodePreview = null;
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
				description: 'Data alat baru telah berhasil disimpan ke dalam sistem.',
				actionLabel: 'Ke Inventori'
			};
			showDialog = true;
		} else if (form?.message) {
			dialogConfig = {
				type: 'error',
				title: 'Gagal Menyimpan',
				description: form.message,
				actionLabel: 'Coba Lagi'
			};
			showDialog = true;
		}
	});
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
	<Button href="/admin/inventaris/alat" variant="outline" class="-mb-2 w-fit md:hidden" size="sm">
		<ChevronLeft class="size-5" /> Kembali
	</Button>

	<div class="flex items-center gap-4">
		<Button href="/admin/inventaris/alat" variant="outline" class="hidden md:flex" size="icon">
			<ChevronLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Tambah Alat Baru</h1>
			<p class="text-sm text-slate-500">Daftarkan aset atau alat laboratorium ke sistem.</p>
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
				<!-- Nama Item -->
				<div class="flex flex-col gap-2 md:col-span-2">
					<div class="flex items-center justify-between">
						<Label for="name">Nama Alat</Label>
						<div class="flex gap-2">
							{#if selectedAssetId}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="h-8 text-xs text-destructive"
									onclick={clearAssetSelection}
								>
									Hapus Pilihan Template
								</Button>
							{/if}
							<Button
								type="button"
								variant="outline"
								size="sm"
								class="h-8 gap-1.5 text-xs"
								onclick={() => (isDialogOpen = true)}
							>
								<Search class="size-3.5" />
								Pilih dari Alat yang Ada
							</Button>
						</div>
					</div>
					<Input
						type="text"
						name="name"
						id="name"
						required
						bind:value={name}
						placeholder="Contoh: Dental Unit X100"
					/>
					{#if selectedAssetId}
						<p class="text-[10px] text-muted-foreground italic">
							Menggunakan template dari alat yang sudah ada.
						</p>
					{/if}
				</div>

				<!-- Dialog Pilih Aset -->
				<Dialog.Root bind:open={isDialogOpen}>
					<Dialog.Content class="sm:max-w-106.25">
						<Dialog.Header>
							<Dialog.Title>Pilih Template Alat</Dialog.Title>
							<Dialog.Description>
								Cari alat yang sudah ada untuk menyamakan penamaan dan data dasar.
							</Dialog.Description>
						</Dialog.Header>
						<div class="space-y-4 py-4">
							<div class="relative">
								<Search class="absolute top-3 left-2.5 size-4 text-muted-foreground" />
								<Input placeholder="Cari nama alat..." bind:value={assetSearchQuery} class="pl-9" />
							</div>
							<div class="max-h-75 overflow-y-auto rounded-md border border-slate-200">
								{#if filteredAssets.length > 0}
									<div class="divide-y">
										{#each filteredAssets as asset (asset.id)}
											<button
												type="button"
												class="flex w-full flex-col p-3 text-left transition hover:bg-slate-50"
												onclick={() => selectAsset(asset)}
											>
												<span class="font-medium text-slate-900">{asset.name}</span>
												<span class="text-xs text-slate-500">
													{asset.equipmentType || 'ASSET'} • {asset.equipments?.[0]?.brand ||
														'No Brand'}
												</span>
											</button>
										{/each}
									</div>
								{:else}
									<div class="p-4 text-center text-sm text-slate-500">Alat tidak ditemukan.</div>
								{/if}
							</div>
						</div>
					</Dialog.Content>
				</Dialog.Root>

				<!-- Kategori Alat (equipmentCategory) -->
				<div class="flex flex-col gap-2">
					<Label for="categoryId">Kategori Keluarga Alat (Opsional)</Label>
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
					<Select.Root
						type="single"
						bind:value={selectedEquipmentType}
					>
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
					<Select.Root type="single" bind:value={selectedLab}>
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
					<Input type="text" name="serialNumber" id="serialNumber" placeholder="S/N: 123456" />
				</div>

				<!-- Merk / Brand -->
				<div class="flex flex-col gap-2">
					<Label for="brand">Merk / Brand (Opsional)</Label>
					<Input
						type="text"
						name="brand"
						id="brand"
						bind:value={brand}
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
						bind:value={variant}
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
						bind:value={storageLocation}
						placeholder="Contoh: Lemari A1"
					/>
				</div>

				<!-- Kondisi Awal -->
				<div class="flex flex-col gap-2">
					<Label for="condition">Kondisi Awal</Label>
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

				<!-- Status Awal -->
				<div class="flex flex-col gap-2">
					<Label for="status">Status Awal</Label>
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
						bind:value={description}
						placeholder="Tambahkan catatan singkat..."
						class="min-h-24"
					/>
				</div>

				<!-- Buttons -->
				<div class="mt-4 flex gap-3 md:col-span-2">
					<Button variant="outline" class="flex-1" href="/admin/inventaris/alat">Batal</Button>
					<Button
						type="submit"
						disabled={isLoading}
						class="flex-1 bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						{isLoading ? 'Menyimpan...' : 'Simpan Alat'}
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
