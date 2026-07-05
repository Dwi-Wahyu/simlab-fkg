<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Save, ChevronLeft, Check, Upload, FileText, Search } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';

	import { untrack } from 'svelte';

	let { data } = $props();

	// File Preview States
	let fileInput: HTMLInputElement | null = $state(null);
	let fileName = $state('');
	let fileSize = $state('');
	let fileType = $state('');
	let filePreviewUrl = $state<string | null>(null);

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			fileName = file.name;
			fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
			fileType = file.type;

			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onload = (e) => {
					filePreviewUrl = e.target?.result as string;
				};
				reader.readAsDataURL(file);
			} else {
				filePreviewUrl = null;
			}
		}
	}

	function removeFile() {
		fileName = '';
		fileSize = '';
		fileType = '';
		filePreviewUrl = null;
		if (fileInput) fileInput.value = '';
	}

	// State form
	let formData = $state({
		equipmentId: '',
		maintenanceType: 'PREVENTIF',
		description: '',
		scheduledDate: '',
		completionDate: '',
		status: 'PENDING',
		technicianId: '',
		cost: 0
	});

	// State untuk dialog notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// Equipment Search Dialog State
	let isEquipmentDialogOpen = $state(false);
	let equipmentSearchQuery = $state('');
	let debouncedEquipmentSearchQuery = $state('');
	let isEquipmentSearching = $state(false);
	let equipmentSearchTimeout = $state<NodeJS.Timeout | null>(null);
	let equipmentCurrentPage = $state(1);
	const EQUIPMENT_PAGE_SIZE = 10;

	// Debounce effect
	$effect(() => {
		const query = equipmentSearchQuery;
		
		untrack(() => {
			isEquipmentSearching = true;
			if (equipmentSearchTimeout) clearTimeout(equipmentSearchTimeout);
			
			equipmentSearchTimeout = setTimeout(() => {
				debouncedEquipmentSearchQuery = query;
				equipmentCurrentPage = 1;
				isEquipmentSearching = false;
			}, 500);
		});
	});

	const filteredEquipments = $derived(
		data.equipment.filter((eq) => {
			const name = eq.item?.name?.toLowerCase() || '';
			const sn = eq.serialNumber?.toLowerCase() || '';
			const q = debouncedEquipmentSearchQuery.toLowerCase();
			return name.includes(q) || sn.includes(q);
		})
	);

	const paginatedEquipments = $derived(
		filteredEquipments.slice(
			(equipmentCurrentPage - 1) * EQUIPMENT_PAGE_SIZE,
			equipmentCurrentPage * EQUIPMENT_PAGE_SIZE
		)
	);

	const equipmentTotalPages = $derived(Math.ceil(filteredEquipments.length / EQUIPMENT_PAGE_SIZE) || 1);

	function selectEquipment(id: string) {
		formData.equipmentId = id;
		isEquipmentDialogOpen = false;
	}

	const maintenanceTypes = [
		{ value: 'PREVENTIF', label: 'Preventif (Perawatan)' },
		{ value: 'KOREKTIF', label: 'Korektif (Perbaikan)' }
		// { value: 'KALIBRASI', label: 'Kalibrasi' }
	];
	const statusOptions = [
		{ value: 'PENDING', label: 'Pending' },
		{ value: 'IN_PROGRESS', label: 'Sedang Berjalan' },
		{ value: 'COMPLETED', label: 'Selesai' }
	];

	// Derived trigger labels
	const selectedEquipmentTrigger = $derived.by(() => {
		const eq = data.equipment.find((e) => e.id === formData.equipmentId);
		if (!eq) return 'Pilih alat';
		const name = eq.item?.name || 'Tanpa Nama';
		return eq.serialNumber ? `${name} (${eq.serialNumber})` : name;
	});

	const selectedTypeTrigger = $derived(
		maintenanceTypes.find((t) => t.value === formData.maintenanceType)?.label ?? 'Pilih Tipe'
	);

	const selectedStatusTrigger = $derived(
		statusOptions.find((s) => s.value === formData.status)?.label ?? 'Pilih Status'
	);

	const selectedTechnicianTrigger = $derived(
		data.technicians.find((t) => t.id === formData.technicianId)?.name ?? 'Pilih teknisi'
	);

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification() {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = 'Data pemeliharaan berhasil disimpan.';
		notificationActionLabel = 'OK';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message || 'Terjadi kesalahan saat menyimpan data.';
		notificationActionLabel = 'Coba Lagi';
		showNotification = true;
	}

	// Handler untuk aksi setelah notifikasi
	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			goto(`/admin/pemeliharaan`);
		}
	}
</script>

<svelte:head>
	<title>Tambah Pemeliharaan | SIM LAB</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
	<Button
		variant="outline"
		href="/admin/pemeliharaan"
		title="Kembali"
		class="-mb-2 w-fit md:hidden"
		size="sm"
	>
		<ChevronLeft class="h-4 w-4" /> Kembali
	</Button>

	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/admin/pemeliharaan" class="hidden md:flex">
				<ChevronLeft size={24} />
			</Button>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-slate-900">
					Tambah Pemeliharaan Baru
				</h1>
				<p class="text-sm text-slate-500">Buat jadwal perawatan atau perbaikan peralatan baru</p>
			</div>
		</div>
	</div>

	<Card.Root mobileAware={true}>
		<Card.Content>
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							showSuccessNotification();
						} else if (result.type === 'failure') {
							showErrorNotification('Terjadi kesalahan');
						}
					};
				}}
				class="space-y-6"
			>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Equipment -->
					<div class="space-y-2">
						<Label for="equipmentId">Peralatan <span class="text-red-500">*</span></Label>
						<input type="hidden" name="equipmentId" value={formData.equipmentId} required />
						<Button
							type="button"
							variant="outline"
							class="h-11 w-full justify-start rounded-xl border-slate-200 font-normal shadow-none hover:bg-slate-50 {formData.equipmentId ? 'text-slate-900' : 'text-slate-500'}"
							onclick={() => isEquipmentDialogOpen = true}
						>
							{selectedEquipmentTrigger}
						</Button>
					</div>

					<!-- Tipe -->
					<div class="space-y-2">
						<Label for="maintenanceType"
							>Tipe Pemeliharaan <span class="text-red-500">*</span></Label
						>
						<Select.Root
							type="single"
							name="maintenanceType"
							bind:value={formData.maintenanceType}
							required
						>
							<Select.Trigger class="h-11 w-full rounded-xl border-slate-200">
								{selectedTypeTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each maintenanceTypes as type}
									<Select.Item value={type.value} label={type.label}>{type.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Tanggal Jadwal -->
					<div class="space-y-2">
						<Label for="scheduledDate">Tanggal Jadwal <span class="text-red-500">*</span></Label>
						<Input
							id="scheduledDate"
							name="scheduledDate"
							type="datetime-local"
							bind:value={formData.scheduledDate}
							required
							class="h-11 rounded-xl border-slate-200"
						/>
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label for="status">Status <span class="text-red-500">*</span></Label>
						<Select.Root type="single" name="status" bind:value={formData.status} required>
							<Select.Trigger class="h-11 w-full rounded-xl border-slate-200">
								{selectedStatusTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each statusOptions as status}
									<Select.Item value={status.value} label={status.label}>{status.label}</Select.Item
									>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Tanggal Selesai -->
					<div class="space-y-2">
						<Label for="completionDate">Tanggal Selesai (Opsional)</Label>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							bind:value={formData.completionDate}
							class="h-11 rounded-xl border-slate-200"
						/>
					</div>

					<!-- Teknisi -->
					{#if data.userRole !== 'teknisi'}
						<div class="space-y-2">
							<Label for="technicianId">Teknisi (Opsional)</Label>
							<Select.Root type="single" name="technicianId" bind:value={formData.technicianId}>
								<Select.Trigger class="h-11 w-full rounded-xl border-slate-200">
									{selectedTechnicianTrigger}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="" label="Pilih teknisi">Pilih teknisi</Select.Item>
									{#each data.technicians as tech (tech.id)}
										<Select.Item value={tech.id} label={tech.name}>{tech.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/if}

					<!-- Biaya -->
					<div class="space-y-2">
						<Label for="cost">Biaya (Rp)</Label>
						<Input
							id="cost"
							name="cost"
							type="number"
							min="0"
							bind:value={formData.cost}
							class="h-11 rounded-xl border-slate-200"
							placeholder="Masukkan biaya jika ada..."
						/>
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="space-y-2">
					<Label for="description">Deskripsi Pekerjaan <span class="text-red-500">*</span></Label>
					<Textarea
						id="description"
						name="description"
						bind:value={formData.description}
						required
						rows={4}
						class="resize-none rounded-xl border-slate-200"
						placeholder="Jelaskan detail pemeliharaan..."
					/>
				</div>

				<!-- Nota Upload -->
				{#if formData.maintenanceType !== 'KALIBRASI'}
					<div class="space-y-2">
						<Label for="nota">Nota / Bukti Pembayaran (PDF/Gambar) (Opsional)</Label>
						<div
							class="group relative flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition-all hover:border-[#2D5A43] hover:bg-white"
						>
							{#if fileName}
								<div class="flex w-full animate-in flex-col items-center gap-4 zoom-in-95 fade-in">
									{#if filePreviewUrl}
										<div class="relative">
											<img
												src={filePreviewUrl}
												alt="Preview"
												class="max-h-32 rounded-lg border border-slate-200 shadow-sm"
											/>
											<div
												class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2D5A43] text-white shadow-sm"
											>
												<Check size={14} />
											</div>
										</div>
									{:else}
										<div class="rounded-xl bg-slate-100 p-4 text-slate-400">
											<FileText size={48} />
										</div>
									{/if}
									<div class="text-center">
										<p class="max-w-[240px] truncate text-sm font-semibold text-slate-700">
											{fileName}
										</p>
										<p class="text-xs text-slate-500">{fileSize}</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 text-xs text-destructive hover:bg-red-50"
										onclick={removeFile}
									>
										Hapus & Ganti File
									</Button>
								</div>
							{:else}
								<input
									type="file"
									name="nota"
									id="nota"
									bind:this={fileInput}
									class="absolute inset-0 z-10 cursor-pointer opacity-0"
									accept=".pdf,.png,.jpg,.jpeg"
									onchange={handleFileChange}
								/>
								<div class="flex flex-col items-center gap-2 text-center">
									<div class="rounded-full bg-slate-100 p-3 group-hover:bg-[#2D5A43]/10">
										<Upload size={24} class="text-slate-400 group-hover:text-[#2D5A43]" />
									</div>
									<p class="text-sm font-medium text-slate-600">Klik untuk upload nota</p>
									<p class="text-xs text-slate-400">PDF, PNG, JPG (Maks. 5MB)</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
					<Button variant="outline" href="/admin/pemeliharaan" class="h-11 rounded-xl px-6"
						>Batal</Button
					>
					<Button type="submit">
						<Save size={18} />
						Simpan Data
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Notification Dialog -->
	<NotificationDialog
		bind:open={showNotification}
		type={notificationType}
		title={notificationTitle}
		description={notificationDescription}
		actionLabel={notificationActionLabel}
		onAction={handleNotificationAction}
	/>

	<!-- Equipment Search Dialog -->
	<Dialog.Root bind:open={isEquipmentDialogOpen}>
		<Dialog.Content class="sm:max-w-[500px]">
			<Dialog.Header>
				<Dialog.Title>Pilih Peralatan</Dialog.Title>
				<Dialog.Description>Cari dan pilih peralatan yang akan dipelihara.</Dialog.Description>
			</Dialog.Header>
			<div class="flex flex-col gap-4 py-4">
				<div class="relative">
					<Search class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
					<Input
						type="text"
						placeholder="Cari nama atau serial number..."
						class="pl-9 h-10 rounded-xl"
						bind:value={equipmentSearchQuery}
					/>
				</div>

				<div class="flex h-[300px] flex-col gap-2 overflow-y-auto pr-2">
					{#if isEquipmentSearching}
						<!-- Mock Skeleton -->
						{#each Array(5) as _}
							<div class="flex h-16 w-full animate-pulse flex-col justify-center rounded-lg border border-slate-100 bg-slate-50 p-3 px-4">
								<div class="h-4 w-2/3 rounded bg-slate-200"></div>
								<div class="mt-2 h-3 w-1/3 rounded bg-slate-200"></div>
							</div>
						{/each}
					{:else if paginatedEquipments.length === 0}
						<div class="flex h-full items-center justify-center text-sm text-slate-500">
							Tidak ada peralatan ditemukan.
						</div>
					{:else}
						{#each paginatedEquipments as eq (eq.id)}
							<button
								type="button"
								class="flex flex-col items-start justify-center rounded-lg border border-slate-200 p-3 px-4 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
								onclick={() => selectEquipment(eq.id)}
							>
								<span class="font-medium text-slate-900">{eq.item?.name || 'Tanpa Nama'}</span>
								{#if eq.serialNumber}
									<span class="mt-0.5 text-xs text-slate-500">SN: {eq.serialNumber}</span>
								{/if}
							</button>
						{/each}
					{/if}
				</div>

				<!-- Pagination -->
				<div class="flex items-center justify-between border-t pt-4">
					<span class="text-xs font-medium text-slate-500">
						Halaman {equipmentCurrentPage} dari {equipmentTotalPages || 1}
					</span>
					<div class="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							class="h-8 rounded-lg"
							disabled={equipmentCurrentPage <= 1 || isEquipmentSearching}
							onclick={() => equipmentCurrentPage--}
						>
							Sebelumnya
						</Button>
						<Button
							variant="outline"
							size="sm"
							class="h-8 rounded-lg"
							disabled={equipmentCurrentPage >= equipmentTotalPages || isEquipmentSearching}
							onclick={() => equipmentCurrentPage++}
						>
							Selanjutnya
						</Button>
					</div>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
</div>
