<script lang="ts">
	import { ChevronLeft, Upload, X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/components/toast';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';

	let { data, form } = $props();

	let isLoading = $state(false);

	let nama = $state('');
	let institusi = $state('');
	let tanggal = $state(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
	let deskripsi = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let selectedFileName = $state<string | null>(null);

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			if (file.size > 10 * 1024 * 1024) {
				toast.destructive('Gagal', {
					description: 'Ukuran file sertifikat maksimal 10MB.'
				});
				input.value = '';
				selectedFileName = null;
			} else {
				selectedFileName = file.name;
			}
		}
	}

	function removeFile() {
		selectedFileName = null;
		if (fileInput) {
			fileInput.value = '';
		}
	}
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
	<div class="flex items-center gap-4">
		<Button href="/admin/audit" variant="outline" size="icon" class="h-9 w-9">
			<ChevronLeft class="size-5" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Tambah Audit</h1>
			<p class="text-slate-500">Buat rekaman quality & audit baru.</p>
		</div>
	</div>

	<Card.Root mobileAware={true}>
		<Card.Content>
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					isLoading = true;
					return async ({ result }) => {
						isLoading = false;
						if (result.type === 'success') {
							toast.success('Berhasil', { description: 'Audit checklist berhasil ditambahkan.' });
							goto('/admin/audit');
						} else if (result.type === 'failure') {
							toast.destructive('Gagal', {
								description: (result.data as any)?.message || 'Terjadi kesalahan validasi.'
							});
						} else {
							toast.destructive('Gagal', { description: 'Terjadi kesalahan sistem.' });
						}
					};
				}}
				class="space-y-6"
			>
				<!-- Nama Audit -->
				<div class="space-y-2">
					<Label for="nama">Nama Audit <span class="text-red-500">*</span></Label>
					<Input
						id="nama"
						name="nama"
						placeholder="Misal: Audit Kepatuhan Sterilisasi Q1"
						bind:value={nama}
						required
					/>
				</div>

				<!-- Institusi / Laboratorium -->
				<div class="space-y-2">
					<Label for="institusi">Institusi <span class="text-red-500">*</span></Label>
					<Input
						id="institusi"
						name="institusi"
						placeholder="Misal: LAM-PTKes, LAFKES, KAN"
						bind:value={institusi}
						required
					/>
				</div>

				<!-- Tanggal Pelaksanaan -->
				<div class="space-y-2">
					<Label for="tanggal">Tanggal Pelaksanaan <span class="text-red-500">*</span></Label>
					<Input id="tanggal" name="tanggal" type="date" bind:value={tanggal} required />
				</div>

				<!-- Deskripsi / Temuan -->
				<div class="space-y-2">
					<Label for="deskripsi">Deskripsi / Temuan Audit</Label>
					<Textarea
						id="deskripsi"
						name="deskripsi"
						placeholder="Tuliskan temuan, rekomendasi, atau catatan pelaksanaan audit..."
						rows={4}
						bind:value={deskripsi}
					/>
				</div>

				<!-- Upload Sertifikat -->
				<div class="space-y-2">
					<Label for="sertifikat">Sertifikat / Bukti Audit</Label>
					<div class="flex flex-col gap-2">
						<input
							type="file"
							id="sertifikat"
							name="sertifikat"
							accept=".pdf,.png,.jpg,.jpeg"
							class="hidden"
							bind:this={fileInput}
							onchange={handleFileChange}
						/>
						{#if !selectedFileName}
							<button
								type="button"
								onclick={() => fileInput?.click()}
								class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 p-6 transition-colors hover:border-primary/50"
							>
								<Upload class="mb-2 size-8 text-slate-400" />
								<span class="text-sm font-medium text-slate-600">Klik untuk unggah file</span>
								<span class="mt-1 text-xs text-slate-400"
									>PDF, PNG, JPG, atau JPEG (Maks. 10MB)</span
								>
							</button>
						{:else}
							<div class="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
								<div class="flex items-center gap-2 truncate">
									<div class="rounded-lg bg-primary/10 p-2 text-primary">
										<Upload class="size-4" />
									</div>
									<span class="truncate text-sm font-medium text-slate-700">{selectedFileName}</span
									>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="text-slate-400 hover:text-slate-600"
									onclick={removeFile}
								>
									<X class="size-4" />
								</Button>
							</div>
						{/if}
					</div>
				</div>

				<div class="flex items-center justify-end gap-2 border-t pt-6">
					<Button href="/admin/audit" variant="outline" disabled={isLoading}>Batal</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? 'Menyimpan...' : 'Simpan Audit'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
