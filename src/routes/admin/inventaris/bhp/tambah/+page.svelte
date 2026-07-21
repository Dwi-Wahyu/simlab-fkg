<script lang="ts">
	import { ChevronLeft, Search, Upload, X } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { page as pageStore } from '$app/state';
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
	let condition = $state('baik');
	let description = $state('');
	let hideNewBadge = $state(false);

	// State untuk binding Select (Svelte 5 bind:value)
	let selectedCategory = $state(''); // Kategori BHP (equipmentCategory)
	let selectedUnit = $state('PCS'); // Satuan Dasar
	let selectedLab = $state(''); // Laboratorium

	const isRestrictedLabUser = $derived(
		data.user?.role === 'kepalaLab' || data.user?.role === 'laboran'
	);

	$effect(() => {
		if (isRestrictedLabUser && data.user?.laboratorium?.id) {
			selectedLab = data.user.laboratorium.id;
		}
	});

	// State untuk Dialog Pencarian Aset
	let isDialogOpen = $state(false);
	let bhpSearchQuery = $state('');
	let selectedBhpId = $state<string | null>(null);

	const filteredBhp = $derived(
		data.existingBhp.filter((bhp: any) =>
			bhp.name.toLowerCase().includes(bhpSearchQuery.toLowerCase())
		)
	);

	function selectBhp(bhp: any) {
		name = bhp.name;
		selectedCategory = bhp.categoryId || '';
		selectedUnit = bhp.baseUnit || 'PCS';
		description = bhp.description || '';

		selectedBhpId = bhp.id;
		isDialogOpen = false;
	}

	onMount(() => {
		const refItemId = pageStore.url.searchParams.get('itemId');
		if (refItemId) {
			const bhp = data.existingBhp.find((b: any) => b.id === refItemId);
			if (bhp) selectBhp(bhp);
		}
	});

	function clearBhpSelection() {
		selectedBhpId = null;
		name = '';
		brand = '';
		variant = '';
		condition = 'baik';
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
	const labTrigger = $derived(
		data.labs.find((o: any) => o.id === selectedLab)?.name ?? 'Pilih Laboratorium'
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
			goto(`/admin/inventaris/bhp`);
		}
	}

	$effect(() => {
		if (form?.success) {
			dialogConfig = {
				type: 'success',
				title: 'Berhasil!',
				description: 'Data bahan habis pakai baru telah berhasil disimpan.',
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
	<Button href="/admin/inventaris/bhp" variant="outline" class="-mb-2 w-fit md:hidden" size="sm">
		<ChevronLeft class="size-5" /> Kembali
	</Button>

	<div class="flex items-center gap-4">
		<Button href="/admin/inventaris/bhp" variant="outline" class="hidden md:flex" size="icon">
			<ChevronLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Tambah Bahan Habis Pakai</h1>
			<p class="text-sm text-slate-500">
				Daftarkan atau tambah stok bahan habis pakai (BHP) ke sistem.
			</p>
		</div>
	</div>

	<Card.Root mobileAware={true}>
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
				<!-- Nama BHP -->
				<div class="flex flex-col gap-2 md:col-span-2">
					<div class="flex items-center justify-between">
						<Label for="name">Nama Bahan (BHP)</Label>
						<div class="flex gap-2">
							{#if selectedBhpId}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="h-8 text-xs text-destructive"
									onclick={clearBhpSelection}
								>
									Hapus Pilihan Referensi
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
								Pilih dari Referensi yang Ada
							</Button>
						</div>
					</div>
					<Input
						type="text"
						name="name"
						id="name"
						required
						bind:value={name}
						placeholder="Contoh: Alkohol 70%"
					/>
					{#if selectedBhpId}
						<p class="text-[10px] text-muted-foreground italic">
							Menggunakan template dari bahan yang sudah ada (hanya menambah batch stok baru).
						</p>
					{/if}
				</div>

				<!-- Dialog Pilih BHP -->
				<Dialog.Root bind:open={isDialogOpen}>
					<Dialog.Content class="sm:max-w-106.25">
						<Dialog.Header>
							<Dialog.Title>Pilih Referensi Bahan</Dialog.Title>
							<Dialog.Description>
								Cari bahan habis pakai yang sudah ada untuk menyamakan penamaan dan data dasar.
							</Dialog.Description>
						</Dialog.Header>
						<div class="space-y-4 py-4">
							<div class="relative">
								<Search class="absolute top-3 left-2.5 size-4 text-muted-foreground" />
								<Input placeholder="Cari nama bahan..." bind:value={bhpSearchQuery} class="pl-9" />
							</div>
							<div class="max-h-75 overflow-y-auto rounded-md border border-slate-200">
								{#if filteredBhp.length > 0}
									<div class="divide-y">
										{#each filteredBhp as bhp (bhp.id)}
											<button
												type="button"
												class="flex w-full flex-col p-3 text-left transition hover:bg-slate-50"
												onclick={() => selectBhp(bhp)}
											>
												<span class="font-medium text-slate-900">{bhp.name}</span>
												<span class="text-xs text-slate-500">
													Satuan: {bhp.baseUnit}
												</span>
											</button>
										{/each}
									</div>
								{:else}
									<div class="p-4 text-center text-sm text-slate-500">Bahan tidak ditemukan.</div>
								{/if}
							</div>
						</div>
					</Dialog.Content>
				</Dialog.Root>

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

				<!-- Laboratorium Penugasan -->
				<div class="flex flex-col gap-2">
					<Label for="laboratoriumId">Laboratorium Penempatan (Wajib)</Label>
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

				<!-- Merk / Brand -->
				<div class="flex flex-col gap-2">
					<Label for="brand">Merk / Brand (Opsional)</Label>
					<Input
						type="text"
						name="brand"
						id="brand"
						bind:value={brand}
						placeholder="Contoh: OneMed"
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
						placeholder="Contoh: 100ml, 500ml"
					/>
				</div>

				<!-- Kondisi Batch -->
				<div class="flex flex-col gap-2">
					<Label for="condition">Kondisi Batch (Opsional)</Label>
					<Input
						type="text"
						name="condition"
						id="condition"
						bind:value={condition}
						placeholder="Contoh: baik, baru, lama"
					/>
				</div>

				<!-- Stok Awal -->
				<div class="flex flex-col gap-2">
					<Label for="initialStock">Stok Awal</Label>
					<Input type="number" name="initialStock" id="initialStock" min="0" placeholder="0" />
				</div>

				<!-- Tanggal Kedaluwarsa -->
				<div class="flex flex-col gap-2">
					<Label for="expiryDate">Tanggal Kedaluwarsa (opsional)</Label>
					<Input type="date" id="expiryDate" name="expiryDate" />
					<p class="text-xs text-gray-400">
						Kosongkan jika bahan ini tidak memiliki tanggal kedaluwarsa.
					</p>
				</div>

				<!-- Stok Minimum -->
				<div class="flex flex-col gap-2">
					<Label for="minStock">Batas Stok Minimum</Label>
					<Input type="number" name="minStock" id="minStock" min="0" placeholder="0" />
				</div>

				<!-- Opsi Badge Baru -->
				<div class="flex flex-col gap-1.5 md:col-span-2">
					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="hideNewBadge"
							name="hideNewBadge"
							bind:checked={hideNewBadge}
							value="true"
							class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
						/>
						<Label for="hideNewBadge" class="cursor-pointer text-sm font-medium text-slate-700"
							>Jangan tandai sebagai barang baru</Label
						>
					</div>
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
						bind:value={description}
						placeholder="Tambahkan catatan singkat..."
						class="min-h-24"
					/>
				</div>

				<!-- Buttons -->
				<div class="mt-4 flex gap-3 md:col-span-2">
					<Button variant="outline" class="flex-1" href="/admin/inventaris/bhp">Batal</Button>
					<Button
						type="submit"
						disabled={isLoading}
						class="flex-1 bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						{isLoading ? 'Menyimpan...' : 'Simpan BHP'}
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
