<script lang="ts">
	import { base } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { ArrowLeft, Save } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

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
	const selectedEquipmentTrigger = $derived(
		data.equipment.find((e) => e.id === formData.equipmentId)
			? `${data.equipment.find((e) => e.id === formData.equipmentId).item?.name || 'Tanpa Nama'} ${data.equipment.find((e) => e.id === formData.equipmentId).serialNumber ? `(${data.equipment.find((e) => e.id === formData.equipmentId).serialNumber})` : ''}`
			: 'Pilih alat'
	);

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

<div class="mx-auto max-w-4xl space-y-8 p-8">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-slate-900">
					Tambah Pemeliharaan Baru
				</h1>
				<p class="text-sm text-slate-500">Buat jadwal perawatan atau perbaikan peralatan baru</p>
			</div>
		</div>
	</div>

	<Card.Root class="overflow-hidden border-slate-200 shadow-sm">
		<Card.Header class="border-b border-slate-100 bg-slate-50/50">
			<Card.Title
				class="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-500 uppercase"
			>
				Formulir Pemeliharaan
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
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
						<Label for="equipmentId" class="text-xs font-bold text-slate-500 uppercase"
							>Peralatan</Label
						>
						<Select.Root
							type="single"
							name="equipmentId"
							bind:value={formData.equipmentId}
							required
						>
							<Select.Trigger class="h-11 w-full rounded-xl border-slate-200">
								{selectedEquipmentTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each data.equipment as eq (eq.id)}
									<Select.Item
										value={eq.id}
										label="{eq.item?.name || 'Tanpa Nama'} {eq.serialNumber
											? `(${eq.serialNumber})`
											: ''}"
									>
										{eq.item?.name || 'Tanpa Nama'}
										{#if eq.serialNumber}
											<span class="ml-1 text-slate-400">({eq.serialNumber})</span>
										{/if}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<!-- Tipe -->
					<div class="space-y-2">
						<Label for="maintenanceType" class="text-xs font-bold text-slate-500 uppercase"
							>Tipe Pemeliharaan</Label
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
						<Label for="scheduledDate" class="text-xs font-bold text-slate-500 uppercase"
							>Tanggal Jadwal</Label
						>
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
						<Label for="status" class="text-xs font-bold text-slate-500 uppercase">Status</Label>
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
						<Label for="completionDate" class="text-xs font-bold text-slate-500 uppercase"
							>Tanggal Selesai (Opsional)</Label
						>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							bind:value={formData.completionDate}
							class="h-11 rounded-xl border-slate-200"
						/>
					</div>

					<!-- Teknisi -->
					<div class="space-y-2">
						<Label for="technicianId" class="text-xs font-bold text-slate-500 uppercase"
							>Teknisi (Opsional)</Label
						>
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

					<!-- Biaya -->
					<div class="space-y-2">
						<Label for="cost" class="text-xs font-bold text-slate-500 uppercase">Biaya (Rp)</Label>
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
					<Label for="description" class="text-xs font-bold text-slate-500 uppercase"
						>Deskripsi Pekerjaan</Label
					>
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

				<div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
					<Button variant="outline" href="{base}/admin/pemeliharaan" class="h-11 rounded-xl px-6"
						>Batal</Button
					>
					<Button
						type="submit"
						class="h-11 gap-2 rounded-xl bg-slate-900 px-8 text-white shadow-sm hover:bg-slate-800"
					>
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
</div>
