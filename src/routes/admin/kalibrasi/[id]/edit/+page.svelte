<script lang="ts">
	import { base } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { ArrowLeft, Upload, Calendar, Building2, Wallet, FileCheck, Clock, FileText, Check } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	let isLoading = $state(false);
	let selectedAssetId = $state(data.calibration.equipmentId);

	// File Preview States
	let fileInput: HTMLInputElement | null = $state(null);
	let fileName = $state(data.calibration.certificateName || '');
	let fileSize = $state('');
	let fileType = $state('');
	let filePreviewUrl = $state<string | null>(data.calibration.certificatePath || null);

	// Notification Dialog States
	let showSuccessDialog = $state(false);

	const assetTriggerContent = $derived(
		data.assets.find((a) => a.id === selectedAssetId)?.item?.name ?? 'Pilih Alat'
	);

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

	$effect(() => {
		if (form?.success) {
			showSuccessDialog = true;
		} else if (form?.message) {
			toast.error(form.message);
		}
	});

	function handleDialogAction() {
		showSuccessDialog = false;
		goto(`${base}/admin/pemeliharaan?tab=kalibrasi`);
	}

	function formatDateForInput(date: Date | string | null) {
		if (!date) return '';
		const d = new Date(date);
		return d.toISOString().split('T')[0];
	}
</script>

<div class="mx-auto max-w-3xl space-y-8 p-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button href="{base}/admin/pemeliharaan?tab=kalibrasi" variant="ghost" size="icon">
			<ArrowLeft size={20} />
		</Button>
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Edit Kalibrasi</h1>
			<p class="text-sm text-slate-500">Perbarui data kalibrasi alat.</p>
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
				class="space-y-6"
			>
				<!-- Alat Section -->
				<div class="grid gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="equipmentId" class="flex items-center gap-2">
							Alat <span class="text-red-500">*</span>
						</Label>
						<Select.Root type="single" bind:value={selectedAssetId}>
							<Select.Trigger class="w-full text-left">
								{assetTriggerContent}
							</Select.Trigger>
							<Select.Content>
								{#each data.assets as asset (asset.id)}
									<Select.Item
										value={asset.id}
										label={asset.item?.name + ' (SN: ' + (asset.serialNumber || '-') + ')'}
									>
										{asset.item?.name} (SN: {asset.serialNumber || '-'})
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="equipmentId" value={selectedAssetId} required />
					</div>

					<div class="space-y-2">
						<Label for="vendor" class="flex items-center gap-2">
							<Building2 size={16} class="text-slate-400" />
							Vendor Pelaksana
						</Label>
						<Input
							type="text"
							name="vendor"
							id="vendor"
							value={data.calibration.vendor}
							placeholder="Contoh: PT. Kalibrasi Indonesia"
						/>
					</div>
				</div>

				<!-- Date & Cost Section -->
				<div class="grid gap-6 md:grid-cols-3">
					<div class="space-y-2">
						<Label for="completionDate" class="flex items-center gap-2">
							<Calendar size={16} class="text-slate-400" />
							Tanggal Kalibrasi <span class="text-red-500">*</span>
						</Label>
						<Input 
							type="date" 
							name="completionDate" 
							id="completionDate" 
							value={formatDateForInput(data.calibration.completionDate)}
							required 
						/>
					</div>

					<div class="space-y-2">
						<Label for="expiryDate" class="flex items-center gap-2">
							<Clock size={16} class="text-slate-400" />
							Masa Berlaku <span class="text-red-500">*</span>
						</Label>
						<Input 
							type="date" 
							name="expiryDate" 
							id="expiryDate" 
							value={formatDateForInput(data.calibration.expiryDate)}
							required 
						/>
					</div>

					<div class="space-y-2">
						<Label for="cost" class="flex items-center gap-2">
							<Wallet size={16} class="text-slate-400" />
							Biaya (Rp)
						</Label>
						<Input 
							type="number" 
							name="cost" 
							id="cost" 
							value={data.calibration.cost}
							placeholder="0" 
							min="0" 
						/>
					</div>
				</div>

				<!-- Certificate Upload -->
				<div class="space-y-2">
					<Label for="certificate" class="flex items-center gap-2">
						<FileCheck size={16} class="text-slate-400" />
						Sertifikat Kalibrasi (PDF/Gambar)
					</Label>
					<div
						class="group relative flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 transition-all hover:border-[#2D5A43] hover:bg-white"
					>
						{#if fileName}
							<div class="flex w-full flex-col items-center gap-4 animate-in fade-in zoom-in-95">
								{#if filePreviewUrl && (filePreviewUrl.startsWith('data:image/') || filePreviewUrl.startsWith('/uploads/'))}
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
								name="certificate"
								id="certificate"
								bind:this={fileInput}
								class="absolute inset-0 z-10 cursor-pointer opacity-0"
								accept=".pdf,.png,.jpg,.jpeg"
								onchange={handleFileChange}
							/>
							<div class="flex flex-col items-center gap-2 text-center">
								<div class="rounded-full bg-slate-100 p-3 group-hover:bg-[#2D5A43]/10">
									<Upload size={24} class="text-slate-400 group-hover:text-[#2D5A43]" />
								</div>
								<p class="text-sm font-medium text-slate-600">Klik untuk upload sertifikat</p>
								<p class="text-xs text-slate-400">PDF, PNG, JPG (Maks. 5MB)</p>
							</div>
						{/if}
					</div>
					<input type="hidden" name="existingCertificatePath" value={data.calibration.certificatePath} />
					<input type="hidden" name="existingCertificateName" value={data.calibration.certificateName} />
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Keterangan / Hasil</Label>
					<Textarea
						name="description"
						id="description"
						value={data.calibration.description}
						placeholder="Tambahkan detail hasil kalibrasi..."
						class="min-h-24"
					/>
				</div>

				<!-- Submit Buttons -->
				<div class="flex items-center justify-end gap-3 pt-4">
					<Button variant="outline" href="{base}/admin/pemeliharaan?tab=kalibrasi">Batal</Button>
					<Button
						type="submit"
						disabled={isLoading || !selectedAssetId}
						class="bg-[#2D5A43] text-white hover:bg-[#234735]"
					>
						{isLoading ? 'Memperbarui...' : 'Simpan Perubahan'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>

<NotificationDialog
	bind:open={showSuccessDialog}
	type="success"
	title="Kalibrasi Diperbarui"
	description="Data kalibrasi alat telah berhasil diperbarui."
	onAction={handleDialogAction}
/>
