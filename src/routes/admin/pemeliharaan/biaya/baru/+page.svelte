<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import {
		ChevronLeft,
		Upload,
		Plus,
		Trash2,
		MessageSquare,
		FileText,
		Check,
		CreditCard
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	let isLoading = $state(false);
	let selectedMaintenanceId = $state('none');
	let selectedStatus = $state('MENUNGGU_PEMBAYARAN');

	// Dynamic Items State
	let items = $state([{ name: '', amount: 0, notes: '' }]);
	let activeNoteIndex = $state<number | null>(null);
	let isNoteDialogOpen = $state(false);
	let tempNote = $state('');

	// File Preview States
	let fileInput: HTMLInputElement | null = $state(null);
	let fileName = $state('');
	let fileSize = $state('');
	let filePreviewUrl = $state<string | null>(null);

	// Notification Dialog States
	let showSuccessDialog = $state(false);

	const totalAmount = $derived(items.reduce((acc, item) => acc + (item.amount || 0), 0));

	const maintenanceTriggerContent = $derived.by(() => {
		if (selectedMaintenanceId === 'none') return 'Tidak terkait maintenance spesifik';
		const task = data.maintenanceTasks.find((t) => t.id === selectedMaintenanceId);
		return task ? `${task.equipment?.item?.name} (${task.maintenanceType})` : 'Pilih Maintenance';
	});

	const statusOptions = [
		{ value: 'LUNAS', label: 'Lunas' },
		{ value: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu Pembayaran' }
	];

	const statusTriggerContent = $derived(
		statusOptions.find((s) => s.value === selectedStatus)?.label ?? 'Pilih Status'
	);

	function addItem() {
		items = [...items, { name: '', amount: 0, notes: '' }];
	}

	function removeItem(index: number) {
		if (items.length > 1) {
			items = items.filter((_, i) => i !== index);
		}
	}

	function openNoteDialog(index: number) {
		activeNoteIndex = index;
		tempNote = items[index].notes;
		isNoteDialogOpen = true;
	}

	function saveNote() {
		if (activeNoteIndex !== null) {
			items[activeNoteIndex].notes = tempNote;
		}
		isNoteDialogOpen = false;
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			if (file.size > 10 * 1024 * 1024) {
				toast.error('Ukuran file maksimal 10MB');
				target.value = '';
				return;
			}
			fileName = file.name;
			fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

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
		filePreviewUrl = null;
		if (fileInput) fileInput.value = '';
	}

	$effect(() => {
		if (selectedMaintenanceId !== 'none') {
			const task = data.maintenanceTasks.find((t) => t.id === selectedMaintenanceId);
			if (task && task.cost > 0) {
				const itemName = `${task.maintenanceType} - ${task.equipment?.item?.name}`;
				// Cek apakah sudah ada item dengan nama yang sama untuk menghindari duplikasi saat tab ganti/render ulang
				const exists = items.some((item) => item.name === itemName);
				if (!exists) {
					// Jika baris pertama masih kosong, gunakan baris tersebut
					if (items.length === 1 && !items[0].name && items[0].amount === 0) {
						items[0].name = itemName;
						items[0].amount = task.cost;
					} else {
						items = [...items, { name: itemName, amount: task.cost, notes: '' }];
					}
				}
			}
		}
	});

	function handleDialogAction() {
		showSuccessDialog = false;
		goto(`/admin/pemeliharaan?tab=biaya`);
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	$effect(() => {
		if (form?.message) {
			toast.error(form.message);
		}
	});
</script>

<div class="mx-auto max-w-4xl flex flex-col gap-6 p-6">
	<Button
		variant="outline"
		href="/admin/pemeliharaan?tab=biaya"
		title="Kembali"
		class="-mb-2 w-fit"
		size="sm"
	>
		<ChevronLeft class="h-4 w-4" /> Kembali
	</Button>

	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/admin/pemeliharaan?tab=biaya" class="hidden md:flex">
				<ChevronLeft size={24} />
			</Button>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-slate-900">
					Catat Analisis Biaya Baru
				</h1>
				<p class="text-sm text-slate-500">Input rincian pengeluaran untuk operasional laboratorium.</p>
			</div>
		</div>
	</div>

	<Card.Root>
		<Card.Content class="p-8">
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					isLoading = true;
					return async ({ result, update }) => {
						isLoading = false;
						if (result.type === 'success') {
							showSuccessDialog = true;
						} else {
							update();
						}
					};
				}}
				class="space-y-8"
			>
				<!-- Info Utama -->
				<div class="grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="name">Nama Biaya / Keperluan <span class="text-red-500">*</span></Label>
						<Input
							type="text"
							name="name"
							id="name"
							placeholder="Misal: Biaya Pemeliharaan Maret 2026"
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="maintenanceId">Terkait Maintenance</Label>
						<Select.Root type="single" bind:value={selectedMaintenanceId}>
							<Select.Trigger class="w-full text-left">
								{maintenanceTriggerContent}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="none">Tidak terkait maintenance spesifik</Select.Item>
								{#each data.maintenanceTasks as task (task.id)}
									<Select.Item
										value={task.id}
										label={`${task.equipment?.item?.name} - ${task.maintenanceType}`}
									>
										<div class="flex flex-col">
											<span>{task.equipment?.item?.name}</span>
											<span class="text-[10px] text-muted-foreground uppercase">
												{task.maintenanceType} - {new Date(task.scheduledDate).toLocaleDateString(
													'id-ID'
												)}
											</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="maintenanceId" value={selectedMaintenanceId} />
					</div>
				</div>

				<!-- Rincian Biaya -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label class="text-lg font-semibold">Rincian Item Biaya</Label>
						<Button type="button" variant="outline" size="sm" onclick={addItem} class="gap-1.5">
							<Plus size={16} />
							Tambah Baris
						</Button>
					</div>

					<div class="space-y-3">
						{#each items as item, i}
							<div
								class="flex animate-in items-start gap-3 duration-200 fade-in slide-in-from-top-2"
							>
								<div class="flex-1">
									<Input placeholder="Deskripsi item (misal: Suku Cadang)" bind:value={item.name} />
								</div>
								<div class="relative w-48">
									<Input type="number" placeholder="0" bind:value={item.amount} class="pr-10" />
									<button
										type="button"
										onclick={() => openNoteDialog(i)}
										class="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#2D5A43]"
										title="Tambahkan Catatan"
									>
										<MessageSquare
											size={16}
											class={item.notes ? 'fill-[#2D5A43] text-[#2D5A43]' : ''}
										/>
									</button>
								</div>
								<Button
									variant="ghost"
									size="icon"
									onclick={() => removeItem(i)}
									disabled={items.length === 1}
									class="text-slate-400 hover:text-red-500"
								>
									<Trash2 size={18} />
								</Button>
							</div>
						{/each}
					</div>

					<!-- Total -->
					<div class="flex justify-end pt-4">
						<div
							class="flex w-full max-w-md items-center justify-between rounded-lg border bg-slate-50 px-6 py-3"
						>
							<span class="text-sm font-medium tracking-wider text-slate-500 uppercase"
								>Total Keseluruhan</span
							>
							<span class="text-xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
						</div>
					</div>
					<input type="hidden" name="items" value={JSON.stringify(items)} />
				</div>

				<div class="grid gap-6 border-t pt-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="status">Status Pembayaran <span class="text-red-500">*</span></Label>
						<Select.Root type="single" bind:value={selectedStatus}>
							<Select.Trigger class="w-full text-left">
								{statusTriggerContent}
							</Select.Trigger>
							<Select.Content>
								{#each statusOptions as opt (opt.value)}
									<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="status" value={selectedStatus} required />
					</div>

					<div class="space-y-2">
						<Label for="dueDate">Tanggal Jatuh Tempo</Label>
						<Input type="date" name="dueDate" id="dueDate" />
					</div>
				</div>

				<!-- Lampiran Bukti -->
				<div class="space-y-2">
					<Label for="attachment">Lampiran Bukti (Kwitansi/Invoice)</Label>
					<div
						class="group relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-[#2D5A43] hover:bg-white"
					>
						{#if fileName}
							<div class="flex w-full items-center justify-between px-4">
								<div class="flex items-center gap-3">
									{#if filePreviewUrl}
										<img
											src={filePreviewUrl}
											alt="Preview"
											class="h-12 w-12 rounded border object-cover"
										/>
									{:else}
										<div class="rounded bg-slate-100 p-2">
											<FileText size={24} class="text-slate-400" />
										</div>
									{/if}
									<div class="text-left">
										<p class="max-w-[200px] truncate text-sm font-semibold text-slate-700">
											{fileName}
										</p>
										<p class="text-xs text-slate-500">{fileSize}</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									class="text-xs text-destructive"
									onclick={removeFile}
								>
									Ganti
								</Button>
							</div>
						{:else}
							<input
								type="file"
								name="attachment"
								id="attachment"
								bind:this={fileInput}
								class="absolute inset-0 z-10 cursor-pointer opacity-0"
								accept=".pdf,.png,.jpg,.jpeg"
								onchange={handleFileChange}
							/>
							<div class="flex flex-col items-center gap-1 text-center">
								<Upload size={20} class="text-slate-400" />
								<p class="text-sm font-medium text-slate-600">Klik untuk upload bukti</p>
								<p class="text-xs text-slate-400">PDF, PNG, JPG (Maks. 10MB)</p>
							</div>
						{/if}
					</div>
				</div>

				<div class="space-y-2">
					<Label for="notes">Keterangan Umum</Label>
					<Textarea
						name="notes"
						id="notes"
						placeholder="Catatan tambahan mengenai pengeluaran ini..."
						class="min-h-20"
					/>
				</div>

				<!-- Submit Buttons -->
				<div class="flex items-center justify-end gap-3 border-t pt-4">
					<Button variant="outline" href="/admin/pemeliharaan?tab=biaya">Batal</Button>
					<Button
						type="submit"
						disabled={isLoading}
						class="min-w-[160px] bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						{isLoading ? 'Menyimpan...' : 'Simpan Analisis'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>

<!-- Note Dialog -->
<Dialog.Root bind:open={isNoteDialogOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Tambah Catatan Item</Dialog.Title>
			<Dialog.Description>Berikan keterangan detail untuk rincian biaya ini.</Dialog.Description>
		</Dialog.Header>
		<div class="py-4">
			<Textarea bind:value={tempNote} placeholder="Ketik catatan di sini..." class="min-h-32" />
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (isNoteDialogOpen = false)}>Batal</Button>
			<Button onclick={saveNote} class="bg-[#2D5A43] text-white">Simpan Catatan</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<NotificationDialog
	bind:open={showSuccessDialog}
	type="success"
	title="Analisis Biaya Tersimpan"
	description="Seluruh rincian biaya telah berhasil dicatat ke dalam sistem."
	onAction={handleDialogAction}
/>
