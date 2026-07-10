<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ChevronLeft, FileText, Search, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data } = $props();

	// Edit states
	let purpose = $state('PRAKTIKUM');
	let nomorSurat = $state('');
	let suratFile = $state<File | null>(null);
	let startDate = $state('');
	let endDate = $state('');

	// Current list of equipment IDs in the loan
	let currentEquipments = $state<
		Array<{
			id: string;
			serialNumber: string | null;
			item?: { name: string };
		}>
	>([]);

	// Convert dates to string format expected by datetime-local (YYYY-MM-DDTHH:MM)
	const toDatetimeLocal = (d: Date | string | null) => {
		if (!d) return '';
		const dateObj = new Date(d);
		// Local time offset adjustment
		const offset = dateObj.getTimezoneOffset();
		const adjusted = new Date(dateObj.getTime() - offset * 60 * 1000);
		return adjusted.toISOString().slice(0, 16);
	};

	$effect(() => {
		const lending = data.lending;
		untrack(() => {
			if (lending) {
				purpose = lending.purpose;
				nomorSurat = lending.nomorSurat || '';
				startDate = toDatetimeLocal(lending.startDate);
				endDate = toDatetimeLocal(lending.endDate);
				currentEquipments = lending.items.map((item: any) => ({
					id: item.equipment.id,
					serialNumber: item.equipment.serialNumber,
					item: { name: item.equipment.item.name }
				}));
			}
		});
	});

	// Remove equipment
	function removeEquipment(id: string) {
		currentEquipments = currentEquipments.filter((e) => e.id !== id);
	}

	// Add equipment
	function addEquipmentToLoan(eq: any) {
		if (currentEquipments.some((e) => e.id === eq.id)) return;
		currentEquipments = [
			...currentEquipments,
			{
				id: eq.id,
				serialNumber: eq.serialNumber,
				item: { name: eq.item?.name || 'Tanpa Nama' }
			}
		];
		isEquipmentDialogOpen = false;
	}

	// Dialog selection search and pagination
	let isEquipmentDialogOpen = $state(false);
	let equipmentSearchQuery = $state('');
	let debouncedEquipmentSearchQuery = $state('');
	let isEquipmentSearching = $state(false);
	let equipmentSearchTimeout = $state<NodeJS.Timeout | null>(null);
	let equipmentCurrentPage = $state(1);
	const EQUIPMENT_PAGE_SIZE = 10;

	// Debounce search query
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

	// Filter available equipments (exclude ones already in currentEquipments)
	const filteredEquipments = $derived(
		data.availableEquipments.filter((eq: any) => {
			if (currentEquipments.some((curr) => curr.id === eq.id)) return false;
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

	const equipmentTotalPages = $derived(
		Math.ceil(filteredEquipments.length / EQUIPMENT_PAGE_SIZE) || 1
	);

	const purposeOptions = [
		{ value: 'PRAKTIKUM', label: 'Praktikum' },
		{ value: 'PENELITIAN_DOSEN', label: 'Penelitian Dosen' },
		{ value: 'PENGABDIAN_MASYARAKAT', label: 'Pengabdian Masyarakat' }
	];
	const purposeTriggerContent = $derived(
		purposeOptions.find((p) => p.value === purpose)?.label ?? 'Pilih keperluan'
	);

	let isSubmitting = $state(false);
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			goto(`/admin/peminjaman/${data.lending.id}`, { invalidateAll: true });
		}
	}
</script>

<svelte:head>
	<title>Edit Peminjaman | SIM LAB</title>
</svelte:head>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
	<Button
		variant="outline"
		href="/admin/peminjaman/{data.lending.id}"
		class="-mb-2 w-fit md:hidden"
		size="sm"
	>
		<ChevronLeft class="size-5" /> Kembali
	</Button>

	<div class="flex items-center gap-4">
		<Button
			variant="outline"
			href="/admin/peminjaman/{data.lending.id}"
			class="hidden md:flex"
			size="icon"
		>
			<ChevronLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Edit Peminjaman</h1>
			<p class="text-muted-foreground">Sesuaikan data peminjaman dan kelola peralatan</p>
		</div>
	</div>

	<form
		method="POST"
		action="?/update"
		enctype="multipart/form-data"
		use:enhance={({ cancel }) => {
			if (currentEquipments.length === 0) {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = 'Harus ada minimal satu alat yang dipinjam.';
				showNotification = true;
				cancel();
				return;
			}
			isSubmitting = true;
			return async ({ result }) => {
				isSubmitting = false;
				if (result.type === 'success') {
					notificationType = 'success';
					notificationTitle = 'Berhasil!';
					notificationDescription = 'Perubahan peminjaman berhasil disimpan.';
					showNotification = true;
				} else if (result.type === 'failure') {
					notificationType = 'error';
					notificationTitle = 'Gagal!';
					notificationDescription = (result.data as any)?.message || 'Gagal menyimpan perubahan.';
					showNotification = true;
				}
			};
		}}
		class="grid gap-6"
	>
		<!-- hidden input to send equipment IDs -->
		<input type="hidden" name="equipmentIds" value={JSON.stringify(currentEquipments.map(e => e.id))} />

		<Card.Root>
			<Card.Header>
				<Card.Title>Detail Peminjaman</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<!-- Peminjam Info -->
				<div class="space-y-1">
					<Label class="text-xs font-bold text-slate-500 uppercase">Peminjam</Label>
					<p class="text-sm font-medium text-slate-900">
						{data.lending.requestedByUser?.name}
					</p>
					<p class="text-[10px] tracking-tight text-slate-500 uppercase">
						{data.lending.requestedByUser?.role} - {data.lending.requestedByUser?.username}
					</p>
				</div>

				<div class="grid gap-6 md:grid-cols-3">
					<div class="space-y-2">
						<Label>Laboratorium</Label>
						<Input value={data.lending.laboratorium?.name} disabled class="bg-slate-50" />
					</div>

					<div class="space-y-2">
						<Label>Tanggal Mulai <span class="text-red-500">*</span></Label>
						<Input type="datetime-local" name="startDate" bind:value={startDate} required />
					</div>

					<div class="space-y-2">
						<Label>Batas Pengembalian</Label>
						<Input type="datetime-local" name="endDate" bind:value={endDate} />
					</div>
				</div>

				<div class="grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label>Keperluan <span class="text-red-500">*</span></Label>
						<Select.Root type="single" bind:value={purpose}>
							<Select.Trigger class="w-full">
								{purposeTriggerContent}
							</Select.Trigger>
							<Select.Content>
								{#each purposeOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="purpose" value={purpose} />
					</div>

					<div class="space-y-2">
						<Label>Nomor Surat</Label>
						<Input type="text" name="nomorSurat" bind:value={nomorSurat} placeholder="Opsional" />
					</div>
				</div>

				<div class="space-y-2">
					<Label>Ganti Surat (PDF/DOCX) &lt; 10MB</Label>
					{#if data.lending.surat}
						<div class="mb-2 text-xs text-muted-foreground flex items-center gap-1.5">
							<FileText class="size-3.5" />
							Surat saat ini: <span class="font-medium text-slate-700">{data.lending.surat}</span>
						</div>
					{/if}
					<Input
						type="file"
						name="surat"
						accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
						onchange={(e) => {
							const target = e.target as HTMLInputElement;
							if (target.files && target.files.length > 0) {
								const file = target.files[0];
								if (file.size > 10 * 1024 * 1024) {
									notificationType = 'error';
									notificationTitle = 'File Terlalu Besar';
									notificationDescription = 'Ukuran file surat maksimal 10MB';
									showNotification = true;
									target.value = '';
									suratFile = null;
								} else {
									suratFile = file;
								}
							}
						}}
					/>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Card Daftar Alat -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Daftar Alat yang Dipinjam</Card.Title>
					<Card.Description>Kelola perlengkapan yang diajukan peminjam</Card.Description>
				</div>
				<Button type="button" size="sm" onclick={() => (isEquipmentDialogOpen = true)}>
					Tambah Alat
				</Button>
			</Card.Header>
			<Card.Content>
				{#if currentEquipments.length === 0}
					<div class="text-center py-8 text-slate-500 text-sm italic">
						Belum ada alat yang ditambahkan. Silakan klik "Tambah Alat".
					</div>
				{:else}
					<div class="divide-y divide-slate-100">
						{#each currentEquipments as eq (eq.id)}
							<div class="flex items-center justify-between py-3">
								<div class="flex flex-col">
									<span class="font-medium text-slate-900">{eq.item?.name || 'Tanpa Nama'}</span>
									{#if eq.serialNumber}
										<span class="text-xs text-slate-500 font-mono">SN: {eq.serialNumber}</span>
									{/if}
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="text-destructive hover:bg-red-50 hover:text-destructive h-8 w-8"
									onclick={() => removeEquipment(eq.id)}
								>
									<Trash2 class="size-4" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
			<Card.Footer class="flex justify-end gap-2 border-t pt-4">
				<Button variant="outline" href="/admin/peminjaman/{data.lending.id}">Batal</Button>
				<Button type="submit" disabled={isSubmitting || currentEquipments.length === 0}>
					{isSubmitting ? 'Memproses...' : 'Simpan Perubahan'}
				</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>

<!-- Notification Dialog -->
<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	onAction={handleNotificationAction}
/>

<!-- Dialog Pilihan Alat (Equipment Search Dialog) -->
<Dialog.Root bind:open={isEquipmentDialogOpen}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Tambah Peralatan</Dialog.Title>
			<Dialog.Description>Pilih peralatan dari laboratorium untuk dipinjam.</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-4 py-4">
			<div class="relative">
				<Search class="absolute top-3 left-3 h-4 w-4 text-slate-400" />
				<Input
					type="text"
					placeholder="Cari nama atau serial number..."
					class="h-10 rounded-xl pl-9"
					bind:value={equipmentSearchQuery}
				/>
			</div>

			<div class="flex h-[300px] flex-col gap-2 overflow-y-auto pr-2">
				{#if isEquipmentSearching}
					{#each Array(5) as _}
						<div
							class="flex h-16 w-full animate-pulse flex-col justify-center rounded-lg border border-slate-100 bg-slate-50 p-3 px-4"
						>
							<div class="h-4 w-2/3 rounded bg-slate-200"></div>
							<div class="mt-2 h-3 w-1/3 rounded bg-slate-200"></div>
						</div>
					{/each}
				{:else if paginatedEquipments.length === 0}
					<div class="flex h-full items-center justify-center text-sm text-slate-500">
						Tidak ada peralatan yang siap atau belum dipilih.
					</div>
				{:else}
					{#each paginatedEquipments as eq (eq.id)}
						<button
							type="button"
							class="flex flex-col items-start justify-center rounded-lg border border-slate-200 p-3 px-4 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
							onclick={() => addEquipmentToLoan(eq)}
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
