<script lang="ts">
	import { ChevronLeft, ChevronRight, Minus, Plus, Search } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

	let selectedItems = $state<{ itemId: string; name: string; qty: number; maxStock: number }[]>([]);
	let unit = $state('');
	let purpose = $state('PENELITIAN_MAHASISWA');
	let startDate = $state('');
	let endDate = $state('');
	let nomorSurat = $state('');
	let suratFile = $state<File | null>(null);

	let searchAlat = $state('');
	let alatPage = $state(1);
	const ITEMS_PER_PAGE = 5;
	let labId = $state('');
	$effect(() => {
		labId = data.selectedLabId || '';
	});

	$effect(() => {
		const url = new URL(window.location.href);
		if (labId) {
			if (url.searchParams.get('labId') !== labId) {
				url.searchParams.set('labId', labId);
				goto(url, { replaceState: true, keepFocus: true, noScroll: true });
			}
		} else {
			if (url.searchParams.has('labId')) {
				url.searchParams.delete('labId');
				goto(url, { replaceState: true, keepFocus: true, noScroll: true });
			}
		}
	});

	$effect(() => {
		searchAlat;
		untrack(() => {
			alatPage = 1;
		});
	});

	const filteredAlat = $derived(
		data.items.filter((i) => i.name.toLowerCase().includes(searchAlat.toLowerCase()))
	);

	const paginatedAlat = $derived(
		filteredAlat.slice((alatPage - 1) * ITEMS_PER_PAGE, alatPage * ITEMS_PER_PAGE)
	);

	const getPaginationInfo = (total: number, page: number, label: string) => {
		const start = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
		const end = Math.min(page * ITEMS_PER_PAGE, total);
		return `Menampilkan ${start} - ${end} ${label}`;
	};

	const purposeOptions = [
		{ value: 'PENELITIAN_MAHASISWA', label: 'Penelitian / Skripsi Mahasiswa' },
		{ value: 'LOMBA', label: 'Lomba / Kompetisi' },
		{ value: 'ORGANISASI_MAHASISWA', label: 'Kegiatan Organisasi Mahasiswa' }
	];

	const purposeTriggerContent = $derived(
		purposeOptions.find((p) => p.value === purpose)?.label ?? 'Pilih keperluan'
	);

	const addItem = (item: any) => {
		if (selectedItems.find((i) => i.itemId === item.id)) return;
		selectedItems = [
			...selectedItems,
			{
				itemId: item.id,
				name: item.name,
				qty: 1,
				maxStock: item.equipments?.length || 0
			}
		];
	};

	const updateQty = (id: string, delta: number) => {
		selectedItems = selectedItems.map((i) => {
			if (i.itemId === id) {
				const newQty = Math.max(1, Math.min(i.maxStock, i.qty + delta));
				return { ...i, qty: newQty };
			}
			return i;
		});
	};

	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	let isSubmitting = $state(false);

	function showSuccessNotification() {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = 'Pengajuan peminjaman berhasil dikirim. Menunggu verifikasi.';
		notificationActionLabel = 'Selesai';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message || 'Terjadi kesalahan saat mengirim pengajuan.';
		notificationActionLabel = 'Coba Lagi';
		showNotification = true;
	}

	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			goto(`/admin/peminjaman`, { invalidateAll: true });
		}
	}
</script>

<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
	<Button href="/admin/peminjaman" variant="outline" class="-mb-2 flex w-fit md:hidden" size="sm">
		<ChevronLeft class="size-5" /> Kembali
	</Button>

	<div class="flex items-center gap-4">
		<Button href="/admin/peminjaman" variant="outline" class="hidden md:flex" size="icon">
			<ChevronLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">Ajukan Peminjaman Alat</h1>
			<p class="text-slate-500">
				Ajukan peminjaman alat laboratorium untuk penelitian mandiri, lomba, atau organisasi.
				Pengajuan Anda akan masuk sebagai DRAFT untuk diverifikasi oleh Kepala Lab.
			</p>
		</div>
	</div>

	<form
		method="POST"
		action="?/ajukan"
		enctype="multipart/form-data"
		use:enhance={({ cancel }) => {
			if (selectedItems.length === 0) {
				showErrorNotification('Pilih minimal satu alat');
				cancel();
				return;
			}
			if (!unit.trim()) {
				showErrorNotification('Unit/Organisasi wajib diisi');
				cancel();
				return;
			}
			if (!startDate) {
				showErrorNotification('Pilih tanggal mulai');
				cancel();
				return;
			}
			if (!suratFile) {
				showErrorNotification('Unggah surat permohonan yang sudah ditandatangani');
				cancel();
				return;
			}

			isSubmitting = true;
			return async ({ result }) => {
				isSubmitting = false;
				if (result.type === 'success') {
					showSuccessNotification();
				} else if (result.type === 'failure') {
					showErrorNotification((result.data as any)?.message || 'Terjadi kesalahan');
				}
			};
		}}
		class="grid gap-6 md:grid-cols-2"
	>
		<!-- Left Column: Daftar Alat -->
		<div class="flex flex-col gap-6">
			<Card.Root mobileAware={true}>
				<Card.Header>
					<Card.Title>Daftar Alat</Card.Title>
					<Card.Description>Pilih alat yang ingin Anda ajukan untuk dipinjam</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="mb-4 space-y-2">
						<Label>Filter Laboratorium</Label>
						<Select.Root type="single" bind:value={labId}>
							<Select.Trigger class="w-full">
								{data.labs?.find((l) => l.id === labId)?.name ?? 'Semua Laboratorium'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="" label="Semua Laboratorium">Semua Laboratorium</Select.Item>
								{#each data.labs || [] as lab (lab.id)}
									<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="relative mb-4">
						<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
						<Input placeholder="Cari alat..." class="pl-10" bind:value={searchAlat} />
					</div>
					<div class="grid max-h-[380px] content-start gap-4 overflow-y-auto p-1">
						{#each paginatedAlat as item (item.id)}
							{@const isSelected = selectedItems.some((i) => i.itemId === item.id)}
							<div
								class="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
							>
								<div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
									<div class="flex items-center space-x-3">
										<Checkbox
											id={item.id}
											checked={isSelected}
											onCheckedChange={() => {
												if (isSelected) {
													selectedItems = selectedItems.filter((i) => i.itemId !== item.id);
												} else {
													addItem(item);
												}
											}}
										/>
										<label
											for={item.id}
											class="cursor-pointer leading-tight font-medium text-slate-800"
											>{item.name}</label
										>
									</div>
									<Badge variant="outline" class="ml-8 w-fit text-xs sm:ml-0">
										Total Stok: {item.equipments?.length || 0}
									</Badge>
								</div>

								{#if isSelected}
									<div class="mt-2 flex items-center justify-between pl-8">
										<div class="text-xs text-muted-foreground">Jumlah unit:</div>
										<div class="flex items-center gap-2">
											<Button
												variant="outline"
												size="icon"
												class="h-7 w-7"
												onclick={() => updateQty(item.id, -1)}
											>
												<Minus class="size-3" />
											</Button>
											<span class="w-6 text-center text-sm font-bold text-slate-800"
												>{selectedItems.find((i) => i.itemId === item.id)?.qty}</span
											>
											<Button
												variant="outline"
												size="icon"
												class="h-7 w-7"
												onclick={() => updateQty(item.id, 1)}
											>
												<Plus class="size-3" />
											</Button>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
					<input type="hidden" name="items" value={JSON.stringify(selectedItems)} />
				</Card.Content>
				<Card.Footer class="flex flex-col items-center gap-2.5 border-t pt-4">
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							class="h-8 gap-1"
							disabled={alatPage === 1}
							onclick={() => (alatPage -= 1)}
						>
							<ChevronLeft class="size-3" />
							Sebelumnya
						</Button>
						<span class="px-2 text-xs font-medium">{alatPage}</span>
						<Button
							variant="outline"
							size="sm"
							class="h-8 gap-1"
							disabled={alatPage * ITEMS_PER_PAGE >= filteredAlat.length}
							onclick={() => (alatPage += 1)}
						>
							Selanjutnya
							<ChevronRight class="size-3" />
						</Button>
					</div>
					<div class="text-[10px] text-muted-foreground">
						{getPaginationInfo(filteredAlat.length, alatPage, 'alat')}
					</div>
				</Card.Footer>
			</Card.Root>
		</div>

		<!-- Right Column: Detail Form -->
		<div class="flex flex-col gap-6">
			<Card.Root mobileAware={true}>
				<Card.Header class="hidden sm:block">
					<Card.Title>Detail Pengajuan</Card.Title>
					<Card.Description>Isi detail informasi peminjaman Anda</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4 pt-6 sm:pt-0">
					<!-- Unit/Organisasi -->
					<div class="space-y-2">
						<Label for="unit"
							>Unit / Organisasi / Judul Riset <span class="text-red-500">*</span></Label
						>
						<Input
							id="unit"
							name="unit"
							bind:value={unit}
							placeholder="e.g. Penelitian Mandiri Skripsi / UKM Seni / Panitia Seminar"
							required
						/>
					</div>

					<!-- Keperluan -->
					<div class="space-y-2">
						<Label>Keperluan Peminjaman <span class="text-red-500">*</span></Label>
						<Select.Root type="single" bind:value={purpose}>
							<Select.Trigger class="w-full">
								{purposeTriggerContent}
							</Select.Trigger>
							<Select.Content>
								{#each purposeOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
									>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="purpose" value={purpose} />
					</div>

					<!-- Rentang Tanggal -->
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="startDate">Tanggal Mulai <span class="text-red-500">*</span></Label>
							<Input
								id="startDate"
								type="datetime-local"
								name="startDate"
								bind:value={startDate}
								required
							/>
						</div>

						<div class="space-y-2">
							<Label for="endDate">Rencana Pengembalian</Label>
							<Input id="endDate" type="datetime-local" name="endDate" bind:value={endDate} />
						</div>
					</div>

					<!-- Nomor Surat -->
					<div class="space-y-2">
						<Label for="nomorSurat">Nomor Surat Permohonan</Label>
						<Input
							id="nomorSurat"
							type="text"
							name="nomorSurat"
							bind:value={nomorSurat}
							placeholder="e.g. 123/UN4.2/PL/2026"
						/>
					</div>

					<!-- Upload Surat & Notice -->
					<div class="space-y-3 pt-2">
						<div class="space-y-1.5">
							<Label for="surat"
								>Surat Permohonan (PDF/DOCX, maks 10MB) <span class="text-red-500">*</span></Label
							>
							<Input
								id="surat"
								type="file"
								name="surat"
								accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
								required
								onchange={(e) => {
									const target = e.target as HTMLInputElement;
									if (target.files && target.files.length > 0) {
										const file = target.files[0];
										if (file.size > 10 * 1024 * 1024) {
											showErrorNotification('Ukuran file maksimal 10MB');
											target.value = '';
											suratFile = null;
										} else {
											suratFile = file;
										}
									}
								}}
							/>
						</div>

						<div
							class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 shadow-xs"
						>
							<strong>Penting:</strong> Surat permohonan yang diunggah harus sudah
							<strong>ditandatangani</strong> oleh pihak yang berwenang (Dosen Pembimbing / PJ Kegiatan
							/ Ketua Organisasi) sebelum diunggah. Surat yang belum ditandatangani akan diminta untuk
							diunggah ulang oleh Kepala Lab saat proses verifikasi.
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2 border-t pt-4">
					<Button variant="outline" href="/admin/peminjaman">Batal</Button>
					<Button
						type="submit"
						disabled={isSubmitting || selectedItems.length === 0}
						class="bg-[#006a34] text-white hover:bg-[#268549]"
					>
						{isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</form>
</div>

<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	actionLabel={notificationActionLabel}
	onAction={handleNotificationAction}
/>
