<script lang="ts">
	import { base } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import {
		ArrowLeft,
		Calendar,
		Clock,
		User,
		Package,
		FileText,
		Camera,
		CheckCircle2,
		XCircle,
		AlertCircle,
		MessageSquare,
		Edit
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { cn } from '$lib/utils';

	let { data } = $props();

	// State for return mode
	let isReturnMode = $state(false);
	let returnData = $state<
		Record<
			string,
			{
				status: string;
				notes: string;
				evidence: File | null;
				showNotes: boolean;
				previewUrl: string | null;
			}
		>
	>({});

	function startReturnMode() {
		const initialData: typeof returnData = {};
		data.lending.items.forEach((item: any) => {
			initialData[item.id] = {
				status: 'BAIK',
				notes: '',
				evidence: null,
				showNotes: false,
				previewUrl: null
			};
		});
		returnData = initialData;
		isReturnMode = true;
	}

	// Notification Dialog State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	const statusOptions = [
		{ value: 'BAIK', label: 'Baik' },
		{ value: 'RUSAK_RINGAN', label: 'Rusak Ringan' },
		{ value: 'RUSAK_BERAT', label: 'Rusak Berat' }
	];

	function handleFileChange(itemId: string, event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			returnData[itemId].evidence = file;
			returnData[itemId].previewUrl = URL.createObjectURL(file);
		}
	}

	const formatDateTime = (date: Date | null) => {
		if (!date) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'APPROVED':
				return { label: 'Disetujui', class: 'bg-green-100 text-green-700 border-green-200' };
			case 'DIPINJAM':
				return { label: 'Sedang Dipinjam', class: 'bg-blue-100 text-blue-700 border-blue-200' };
			case 'RETURNED':
				return { label: 'Dikembalikan', class: 'bg-slate-100 text-slate-700 border-slate-200' };
			case 'REJECTED':
				return { label: 'Ditolak', class: 'bg-red-100 text-red-700 border-red-200' };
			default:
				return { label: status, class: '' };
		}
	};

	const badge = $derived(getStatusBadge(data.lending.status));
</script>

<div class="mx-auto max-w-5xl space-y-6 p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-4">
			<Button href="{base}/admin/peminjaman" variant="outline" size="icon" class="rounded-full">
				<ArrowLeft class="size-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Detail Peminjaman</h1>
				<p class="text-sm text-muted-foreground">ID: {data.lending.id}</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Badge variant="outline" class={cn('px-3 py-1 text-xs font-semibold uppercase', badge.class)}>
				{badge.label}
			</Badge>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Info Utama -->
		<div class="space-y-6 lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Informasi Peminjaman</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-y-6 gap-x-12 sm:grid-cols-2">
						<div class="space-y-1">
							<Label class="text-xs font-bold text-slate-500 uppercase">ID Peminjaman</Label>
							<p class="text-sm font-mono font-medium text-slate-600">{data.lending.id}</p>
						</div>

						<div class="space-y-1">
							<Label class="text-xs font-bold text-slate-500 uppercase">Laboratorium</Label>
							<p class="text-sm font-medium text-slate-900">{data.lending.laboratorium?.name}</p>
						</div>

						<div class="space-y-1">
							<Label class="text-xs font-bold text-slate-500 uppercase">Peminjam</Label>
							<div>
								<p class="text-sm font-medium text-slate-900">{data.lending.requestedByUser?.name}</p>
								<p class="text-[10px] text-slate-500 uppercase tracking-tight">
									{data.lending.requestedByUser?.role} — {data.lending.requestedByUser?.username}
								</p>
							</div>
						</div>

						<div class="space-y-1">
							<Label class="text-xs font-bold text-slate-500 uppercase">Status Saat Ini</Label>
							<div>
								<Badge variant="outline" class={cn('px-2 py-0.5 text-[10px] font-bold uppercase', badge.class)}>
									{badge.label}
								</Badge>
							</div>
						</div>

						<div class="space-y-1">
							<Label class="text-xs font-bold text-slate-500 uppercase">Waktu Pinjam</Label>
							<p class="text-sm font-medium text-slate-900">{formatDateTime(data.lending.startDate)}</p>
						</div>

						<div class="space-y-1">
							<Label class="text-xs font-bold text-slate-500 uppercase">Batas Kembali</Label>
							<p class="text-sm font-medium text-slate-900">{formatDateTime(data.lending.endDate)}</p>
						</div>

						{#if data.latenessMinutes > 0 && data.lending.status === 'DIPINJAM'}
							<div class="sm:col-span-2 rounded-lg border border-red-100 bg-red-50/50 p-3 text-red-700">
								<p class="text-xs font-bold uppercase tracking-wider">Peringatan Keterlambatan</p>
								<p class="mt-1 text-sm">
									Melewati batas waktu selama
									<strong>{Math.floor(data.latenessMinutes / 60)} jam {data.latenessMinutes % 60} menit</strong
									>.
								</p>
							</div>
						{/if}

						<div class="space-y-1 sm:col-span-2 pt-4 border-t border-slate-50">
							<Label class="text-xs font-bold text-slate-500 uppercase">Keperluan</Label>
							<div class="flex items-center gap-2 mt-1">
								<Badge variant="secondary" class="uppercase text-[10px]">
									{data.lending.purpose.replace('_', ' ')}
								</Badge>
								<span class="text-sm text-slate-600">— {data.lending.unit}</span>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Daftar Alat -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-lg">Daftar Alat yang Dipinjam</Card.Title>
					<Badge variant="secondary" class="rounded-full">{data.lending.items.length} Item</Badge>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#each data.lending.items as item (item.id)}
							<div
								class="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md"
							>
								<div class="flex items-start justify-between gap-4">
									<div class="flex items-center gap-4">
										<div>
											<h4 class="font-bold text-slate-900">{item.equipment?.item?.name}</h4>
											<p class="text-xs tracking-wider text-muted-foreground uppercase">
												SN: {item.equipment?.serialNumber || '-'}
											</p>
										</div>
									</div>
									<div class="text-right">
										<div class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
											Kondisi Awal
										</div>
										<Badge variant="outline" class="mt-1 text-[10px] uppercase"
											>{item.equipment?.condition}</Badge
										>
									</div>
								</div>

								{#if isReturnMode && returnData[item.id]}
									<Separator />
									<div class="grid gap-4 sm:grid-cols-2">
										<div class="space-y-2">
											<Label class="text-[10px] font-bold text-slate-500 uppercase"
												>Status Kembali</Label
											>
											<div class="flex gap-2">
												<div class="flex-1">
													<Select.Root type="single" bind:value={returnData[item.id].status}>
														<Select.Trigger class="h-9 w-full rounded-lg text-xs">
															{statusOptions.find((o) => o.value === returnData[item.id].status)
																?.label}
														</Select.Trigger>
														<Select.Content>
															{#each statusOptions as opt}
																<Select.Item value={opt.value} label={opt.label}
																	>{opt.label}</Select.Item
																>
															{/each}
														</Select.Content>
													</Select.Root>
												</div>
												<Button
													variant="outline"
													size="icon"
													class={cn(
														'h-9 w-9 rounded-lg transition-colors',
														returnData[item.id].showNotes &&
															'border-slate-300 bg-slate-100 text-slate-900'
													)}
													onclick={() =>
														(returnData[item.id].showNotes = !returnData[item.id].showNotes)}
												>
													<MessageSquare class="size-4" />
												</Button>
											</div>
										</div>

										<div class="space-y-2">
											{#if returnData[item.id].status !== 'BAIK'}
												<Label class="text-[10px] font-bold text-slate-500 uppercase"
													>Bukti Kerusakan</Label
												>
												<div class="flex flex-wrap gap-3">
													<input
														type="file"
														accept="image/*"
														id="file-{item.id}"
														class="hidden"
														onchange={(e) => handleFileChange(item.id, e)}
													/>
													<label
														for="file-{item.id}"
														class="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-all hover:border-slate-400 hover:bg-slate-100"
													>
														<Camera class="size-5" />
														<span class="mt-1 text-[8px] font-bold uppercase">Upload</span>
													</label>

													{#if returnData[item.id].previewUrl}
														<div
															class="relative h-20 w-20 overflow-hidden rounded-lg border shadow-sm"
														>
															<img
																src={returnData[item.id].previewUrl}
																alt="Preview"
																class="h-full w-full object-cover"
															/>
															<button
																class="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
																onclick={() => {
																	returnData[item.id].evidence = null;
																	returnData[item.id].previewUrl = null;
																}}
															>
																<XCircle class="size-3" />
															</button>
														</div>
													{/if}
												</div>
											{/if}
										</div>

										{#if returnData[item.id].showNotes}
											<div class="sm:col-span-2">
												<Label class="text-[10px] font-bold text-slate-500 uppercase"
													>Catatan Tambahan</Label
												>
												<Textarea
													bind:value={returnData[item.id].notes}
													placeholder="Tulis alasan jika rusak atau catatan lainnya..."
													class="mt-1 min-h-[80px] rounded-lg text-xs"
												/>
											</div>
										{/if}
									</div>
								{:else if item.returnStatus}
									<!-- Hasil Pengembalian (jika sudah dikembalikan) -->
									<Separator />
									<div class="rounded-lg bg-slate-50 p-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="text-xs font-bold text-slate-700 uppercase"
													>Sudah Dikembalikan</span
												>
											</div>
											<Badge variant="outline" class="text-[10px] uppercase"
												>{item.returnStatus}</Badge
											>
										</div>
										{#if item.returnNotes}
											<p class="mt-2 text-xs text-slate-500 italic">"{item.returnNotes}"</p>
										{/if}
										{#if item.returnEvidencePath}
											<div class="mt-3">
												<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
													Bukti:
												</p>
												<img
													src={item.returnEvidencePath}
													alt="Bukti"
													class="mt-1 h-20 w-20 rounded-lg border object-cover shadow-sm transition-transform hover:scale-105"
												/>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar Action -->
		<div class="space-y-6">
			<Card.Root class="sticky top-6 border-slate-200 shadow-lg">
				<Card.Header>
					<Card.Title class="text-sm font-bold text-slate-500 uppercase">Aksi Peminjaman</Card.Title
					>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#if !isReturnMode}
						<Button href="{base}/admin/peminjaman" variant="outline" class="w-full gap-2 rounded-xl">
							Kembali
						</Button>
						{#if data.lending.status !== 'RETURNED'}
							<Button
								href="{base}/admin/peminjaman/{data.lending.id}/edit"
								variant="outline"
								class="w-full gap-2 rounded-xl"
							>
								Edit Data
							</Button>
							{#if ['APPROVED', 'DIPINJAM'].includes(data.lending.status)}
								<Button
									onclick={startReturnMode}
									class="w-full gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
								>
									Pengembalian Alat
								</Button>
							{/if}
						{/if}
					{:else}
						<form
							method="POST"
							action="?/returnItems"
							use:enhance={({ formData }) => {
								const items = Object.entries(returnData).map(([id, d]) => ({
									lendingItemId: id,
									equipmentId: data.lending.items.find((i: any) => i.id === id).equipmentId,
									status: d.status,
									notes: d.notes,
									hasEvidence: !!d.evidence
								}));
								formData.append('itemReturnData', JSON.stringify(items));

								// Append files separately
								items.forEach((item) => {
									const file = returnData[item.lendingItemId].evidence;
									if (file) {
										formData.append(`evidence_${item.lendingItemId}`, file);
									}
								});

								return async ({ result }) => {
									if (result.type === 'success') {
										notificationType = 'success';
										notificationTitle = 'Berhasil Dikembalikan';
										notificationDescription = 'Semua alat telah berhasil dicatat pengembaliannya.';
										showNotification = true;
										isReturnMode = false;
										await invalidateAll();
									} else {
										notificationType = 'error';
										notificationTitle = 'Gagal';
										notificationDescription = 'Terjadi kesalahan saat memproses pengembalian.';
										showNotification = true;
									}
								};
							}}
						>
							<div class="flex flex-col gap-3">
								<Button
									type="submit"
									class="w-full gap-2 rounded-xl bg-green-600 hover:bg-green-700"
								>
									Konfirmasi Pengembalian
								</Button>
								<Button
									type="button"
									variant="ghost"
									onclick={() => (isReturnMode = false)}
									class="w-full gap-2 rounded-xl border border-slate-200"
								>
									Batalkan
								</Button>
							</div>
						</form>
					{/if}
				</Card.Content>
				<Card.Footer class="bg-slate-50/50 pt-4">
					<div class="w-full text-center">
						<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
							Dibuat Pada
						</p>
						<p class="text-xs font-medium text-slate-600">
							{formatDateTime(data.lending.createdAt)}
						</p>
					</div>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</div>

<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	onAction={() => {
		showNotification = false;
		if (notificationType === 'success') {
			goto(`${base}/admin/peminjaman`);
		}
	}}
/>
