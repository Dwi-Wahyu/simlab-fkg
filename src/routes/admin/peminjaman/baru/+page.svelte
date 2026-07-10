<script lang="ts">
	import { ChevronLeft, ChevronRight, Minus, Plus, Search } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';

	let { data } = $props();

	let selectedRequesters = $state<string[]>([]);
	let selectedItems = $state<{ itemId: string; name: string; qty: number; maxStock: number }[]>([]);
	let labId = $state('');
	let startDate = $state('');
	let endDate = $state('');
	let purpose = $state('PRAKTIKUM');
	let nomorSurat = $state('');
	let suratFile = $state<File | null>(null);

	$effect(() => {
		if (data.user?.role === 'kepalaLab' && data.user?.laboratorium?.id) {
			labId = data.user.laboratorium.id;
		}
	});

	let searchPeminjam = $state('');
	let searchAlat = $state('');

	$effect(() => {
		searchPeminjam;
		untrack(() => {
			peminjamPage = 1;
		});
	});

	$effect(() => {
		searchAlat;
		untrack(() => {
			alatPage = 1;
		});
	});

	const filteredPeminjam = $derived(
		data.requesters.filter(
			(r) =>
				r.name.toLowerCase().includes(searchPeminjam.toLowerCase()) ||
				r.username.toLowerCase().includes(searchPeminjam.toLowerCase())
		)
	);

	const filteredAlat = $derived(
		data.items.filter((i) => i.name.toLowerCase().includes(searchAlat.toLowerCase()))
	);

	// State untuk dialog notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// State Paginasi
	const ITEMS_PER_PAGE = 5;
	let peminjamPage = $state(1);
	let alatPage = $state(1);

	// Paginated Lists
	const paginatedPeminjam = $derived(
		filteredPeminjam.slice((peminjamPage - 1) * ITEMS_PER_PAGE, peminjamPage * ITEMS_PER_PAGE)
	);
	const paginatedAlat = $derived(
		filteredAlat.slice((alatPage - 1) * ITEMS_PER_PAGE, alatPage * ITEMS_PER_PAGE)
	);

	// Pagination Info Helpers
	const getPaginationInfo = (total: number, page: number, label: string) => {
		const start = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
		const end = Math.min(page * ITEMS_PER_PAGE, total);
		return `Menampilkan ${start} - ${end} ${label}`;
	};

	function mapRole(role: string | null | undefined): string {
		if (!role) return '';
		const lower = role.toLowerCase();
		if (lower === 'instruktur') return 'Dosen';
		if (lower === 'peneliti') return 'Mahasiswa';
		return role.charAt(0).toUpperCase() + role.slice(1);
	}

	const labTriggerContent = $derived(
		data.labs.find((l) => l.id === labId)?.name ?? 'Pilih laboratorium'
	);
	const purposeOptions = [
		{ value: 'PRAKTIKUM', label: 'Praktikum' },
		{ value: 'PENELITIAN_DOSEN', label: 'Penelitian Dosen' },
		{ value: 'PENGABDIAN_MASYARAKAT', label: 'Pengabdian Masyarakat' }
	];
	const purposeTriggerContent = $derived(
		purposeOptions.find((p) => p.value === purpose)?.label ?? 'Pilih keperluan'
	);

	const toggleRequester = (id: string) => {
		if (selectedRequesters.includes(id)) {
			selectedRequesters = selectedRequesters.filter((r) => r !== id);
		} else {
			selectedRequesters = [...selectedRequesters, id];
		}
	};

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

	let totalRequiredStock = $derived(
		selectedItems.reduce(
			(acc, item) => {
				acc[item.itemId] = item.qty * selectedRequesters.length;
				return acc;
			},
			{} as Record<string, number>
		)
	);

	let stockWarnings = $derived(
		selectedItems.filter((item) => {
			const total = totalRequiredStock[item.itemId];
			return total > item.maxStock;
		})
	);

	let isSubmitting = $state(false);

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification() {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = 'Pengajuan peminjaman berhasil dibuat.';
		notificationActionLabel = 'Selesai';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message || 'Terjadi kesalahan saat membuat pengajuan.';
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
			<h1 class="text-3xl font-bold tracking-tight">Peminjaman Baru</h1>
			<p class="text-muted-foreground">Buat peminjaman massal untuk mahasiswa atau dosen.</p>
		</div>
	</div>

	<form
		method="POST"
		action="?/create"
		enctype="multipart/form-data"
		use:enhance={({ cancel }) => {
			if (selectedRequesters.length === 0) {
				showErrorNotification('Pilih minimal satu peminjam');
				cancel();
				return;
			}
			if (selectedItems.length === 0) {
				showErrorNotification('Pilih minimal satu alat');
				cancel();
				return;
			}
			if (stockWarnings.length > 0) {
				showErrorNotification('Stok tidak cukup untuk beberapa item');
				cancel();
				return;
			}
			if (!labId) {
				showErrorNotification('Pilih laboratorium');
				cancel();
				return;
			}
			if (!startDate) {
				showErrorNotification('Pilih tanggal mulai');
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
		class="grid gap-6"
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="flex flex-col gap-6">
				<!-- Daftar Peminjam Section -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Daftar Peminjam</Card.Title>
						<Card.Description>Mahasiswa & Dosen</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="relative mb-4">
							<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
							<Input
								placeholder="Cari peminjam..."
								class="pl-10"
								bind:value={searchPeminjam}
							/>
						</div>
						<div class="grid content-start gap-2 overflow-y-auto p-1">
							{#each paginatedPeminjam as requester (requester.id)}
								<div
									class="flex items-center space-x-3 rounded-lg border p-2 transition-colors hover:bg-muted/50"
								>
									<Checkbox
										id={requester.id}
										checked={selectedRequesters.includes(requester.id)}
										onCheckedChange={() => toggleRequester(requester.id)}
									/>
									<input
										type="hidden"
										name="requesterIds"
										value={requester.id}
										disabled={!selectedRequesters.includes(requester.id)}
									/>
									<label for={requester.id} class="flex-1 cursor-pointer">
										<div class="font-medium">{requester.name}</div>
										<div class="text-[10px] text-muted-foreground uppercase">
											{mapRole(requester.role)} - {requester.username}
										</div>
									</label>
								</div>
							{/each}
						</div>
					</Card.Content>
					<Card.Footer class="flex items-center justify-between border-t pt-4">
						<div class="text-[10px] text-muted-foreground">
							{getPaginationInfo(filteredPeminjam.length, peminjamPage, 'peminjam')}
						</div>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								class="h-8 gap-1"
								disabled={peminjamPage === 1}
								onclick={() => (peminjamPage -= 1)}
							>
								<ChevronLeft class="size-3" />
								Sebelumnya
							</Button>
							<span class="px-2 text-xs font-medium">{peminjamPage}</span>
							<Button
								variant="outline"
								size="sm"
								class="h-8 gap-1"
								disabled={peminjamPage * ITEMS_PER_PAGE >= filteredPeminjam.length}
								onclick={() => (peminjamPage += 1)}
							>
								Selanjutnya
								<ChevronRight class="size-3" />
							</Button>
						</div>
					</Card.Footer>
				</Card.Root>
			</div>

			<!-- Alat Section -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Daftar Alat</Card.Title>
					<Card.Description>Pilih alat dan tentukan jumlah per orang</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="relative mb-4">
						<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
						<Input
							placeholder="Cari alat..."
							class="pl-10"
							bind:value={searchAlat}
						/>
					</div>
					<div class="grid content-start gap-4 overflow-y-auto p-1">
						{#each paginatedAlat as item (item.id)}
							{@const isSelected = selectedItems.some((i) => i.itemId === item.id)}
							<div
								class="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
							>
								<div class="flex items-center justify-between">
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
										<label for={item.id} class="cursor-pointer font-medium">{item.name}</label>
									</div>
									<Badge variant="outline" class="text-xs">
										Stok: {item.equipments?.length || 0}
									</Badge>
								</div>

								{#if isSelected}
									<div class="mt-2 flex items-center justify-between pl-8">
										<div class="text-xs text-muted-foreground">Jumlah per orang:</div>
										<div class="flex items-center gap-2">
											<Button
												variant="outline"
												size="icon"
												class="h-7 w-7"
												onclick={() => updateQty(item.id, -1)}
											>
												<Minus class="size-3" />
											</Button>
											<span class="w-6 text-center text-sm font-bold"
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

									{@const total = totalRequiredStock[item.id]}
									{#if total > (item.equipments?.length || 0)}
										<div class="pl-8 text-[10px] font-semibold text-destructive">
											Total dibutuhkan: {total} (Melebihi stok!)
										</div>
									{:else if selectedRequesters.length > 0}
										<div class="pl-8 text-[10px] text-muted-foreground">
											Total dibutuhkan: {total} unit
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
					<input type="hidden" name="items" value={JSON.stringify(selectedItems)} />
				</Card.Content>
				<Card.Footer class="flex items-center justify-between border-t pt-4">
					<div class="text-[10px] text-muted-foreground">
						{getPaginationInfo(filteredAlat.length, alatPage, 'alat')}
					</div>
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
				</Card.Footer>
			</Card.Root>
		</div>

		<!-- Details Section -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Detail Peminjaman</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-6 md:grid-cols-3">
					{#if data.user?.role !== 'kepalaLab'}
						<div class="space-y-2">
							<Label>Laboratorium <span class="text-red-500">*</span></Label>
							<Select.Root type="single" bind:value={labId}>
								<Select.Trigger class="w-full">
									{labTriggerContent}
								</Select.Trigger>
								<Select.Content>
									{#each data.labs as lab (lab.id)}
										<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="laboratoriumId" value={labId} />
						</div>
					{:else}
						<input type="hidden" name="laboratoriumId" value={labId} />
					{/if}

					<div class="space-y-2">
						<Label>Tanggal Mulai <span class="text-red-500">*</span></Label>
						<Input type="datetime-local" name="startDate" bind:value={startDate} required />
					</div>

					<div class="space-y-2">
						<Label>Batas Pengembalian</Label>
						<Input type="datetime-local" name="endDate" bind:value={endDate} />
					</div>
				</div>

				<div class="mt-6 grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label>Keperluan <span class="text-red-500">*</span></Label>
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

					<div class="space-y-2">
						<Label>Nomor Surat</Label>
						<Input type="text" name="nomorSurat" bind:value={nomorSurat} placeholder="Opsional" />
					</div>

					<div class="space-y-2">
						<Label>Surat (PDF/DOCX) &lt; 10MB</Label>
						<Input 
							type="file" 
							name="surat" 
							accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
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
				</div>
			</Card.Content>
			<Card.Footer class="flex justify-end gap-2 border-t pt-4">
				<div class="flex-1 text-sm font-medium">
					Terpilih: {selectedRequesters.length} orang
				</div>
				<Button variant="outline" href="/admin/peminjaman">Batal</Button>
				<Button type="submit" disabled={isSubmitting || stockWarnings.length > 0}>
					{isSubmitting ? 'Memproses...' : 'Buat Peminjaman'}
				</Button>
			</Card.Footer>
		</Card.Root>
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
