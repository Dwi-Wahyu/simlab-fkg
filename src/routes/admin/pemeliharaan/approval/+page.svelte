<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { ChevronLeft, FileText, CheckCircle2, XCircle, AlertTriangle } from '@lucide/svelte';
	import { toast } from '$lib/components/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Dialog controls
	let isDialogOpen = $state(false);
	let selectedApproval = $state<any>(null);
	let actionType = $state<'approve' | 'reject'>('approve');
	let note = $state('');
	let isSubmitting = $state(false);

	function openReviewDialog(approval: any, type: 'approve' | 'reject') {
		selectedApproval = approval;
		actionType = type;
		note = '';
		isDialogOpen = true;
	}

	function getFormatDate(dateStr: any) {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function getFormatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(val);
	}
</script>

<svelte:head>
	<title>Persetujuan Pemeliharaan | SIM LAB</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
	<Button variant="outline" href="/admin/pemeliharaan" class="mb-2 w-fit">
		<ChevronLeft class="mr-1 size-4" /> Kembali
	</Button>

	<div>
		<h1 class="text-3xl font-bold tracking-tight text-slate-900">Persetujuan Pemeliharaan</h1>
		<p class="text-slate-500">
			Daftar pemeliharaan selesai yang memerlukan verifikasi Kepala Lab / Superadmin.
		</p>
	</div>

	<Card.Root class="overflow-hidden border bg-white p-0 shadow-sm ring-1 ring-slate-100">
		<Card.Header class="border-b bg-slate-50/50 px-6 py-4">
			<Card.Title class="text-lg font-semibold text-slate-900">Menunggu Persetujuan</Card.Title>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root class="w-full min-w-[800px]">
					<Table.Header class="bg-slate-50/50">
						<Table.Row>
							<Table.Head class="px-4 py-3 font-semibold text-slate-900">Peralatan</Table.Head>
							<Table.Head class="px-4 py-3 text-center font-semibold text-slate-900"
								>Jenis</Table.Head
							>
							<Table.Head class="px-4 py-3 text-center font-semibold text-slate-900"
								>Tanggal Selesai</Table.Head
							>
							<Table.Head class="px-4 py-3 text-right font-semibold text-slate-900"
								>Biaya</Table.Head
							>
							<Table.Head class="px-4 py-3 text-center font-semibold text-slate-900"
								>Nota / Bukti</Table.Head
							>
							<Table.Head class="px-4 py-3 text-right font-semibold text-slate-900">Aksi</Table.Head
							>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#if data.approvals.length === 0}
							<Table.Row>
								<Table.Cell colspan={6} class="h-32 text-center text-slate-500">
									Tidak ada permohonan persetujuan pemeliharaan yang pending.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each data.approvals as app (app.id)}
								{@const maint = app.maintenance}
								{@const equip = maint?.equipment}
								<Table.Row class="hover:bg-slate-50/30">
									<Table.Cell class="px-4 py-3 font-medium text-slate-900">
										<div class="flex flex-col">
											<span class="font-semibold">{equip?.item?.name || 'Tanpa Nama'}</span>
											<span class="text-xs text-slate-500 uppercase"
												>S/N: {equip?.serialNumber || '-'}</span
											>
										</div>
									</Table.Cell>

									<Table.Cell class="px-4 py-3 text-center">
										<span
											class="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset
											{maint?.maintenanceType === 'KOREKTIF'
												? 'bg-amber-50 text-amber-800 ring-amber-600/20'
												: 'bg-blue-50 text-blue-800 ring-blue-600/20'}"
										>
											{maint?.maintenanceType || '-'}
										</span>
									</Table.Cell>

									<Table.Cell class="px-4 py-3 text-center text-sm text-slate-600">
										{getFormatDate(maint?.completionDate)}
									</Table.Cell>

									<Table.Cell class="px-4 py-3 text-right text-sm font-semibold text-slate-900">
										{getFormatCurrency(maint?.cost ?? 0)}
									</Table.Cell>

									<Table.Cell class="px-4 py-3 text-center">
										{#if maint?.notaFileName}
											<a
												href="/uploads/receipts/{maint.notaFileName}"
												target="_blank"
												class="inline-flex items-center gap-1 text-xs font-bold text-[#2D5A43] hover:underline"
											>
												<FileText class="size-3.5" /> Lihat Nota
											</a>
										{:else}
											<span
												class="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-600/10"
												title="Tidak ada bukti pembayaran terlampir."
											>
												<AlertTriangle class="size-3 text-red-500" /> Tanpa Nota
											</span>
										{/if}
									</Table.Cell>

									<Table.Cell class="px-4 py-3 text-right">
										<div class="flex justify-end gap-2">
											<Button
												size="sm"
												variant="outline"
												class="h-8 gap-1.5 border-red-200 text-red-600 hover:bg-red-50/50 hover:text-red-700"
												onclick={() => openReviewDialog(app, 'reject')}
											>
												<XCircle class="size-3.5" /> Tolak
											</Button>
											<Button
												size="sm"
												class="h-8 gap-1.5 bg-[#2D5A43] text-white hover:bg-[#234735]"
												onclick={() => openReviewDialog(app, 'approve')}
											>
												<CheckCircle2 class="size-3.5" /> Setujui
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- REVIEW CONFIRMATION DIALOG -->
<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content class="sm:max-w-[450px]">
		<form
			method="POST"
			action="?/review"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						isDialogOpen = false;
						toast.success('Persetujuan diproses', {
							description:
								actionType === 'approve'
									? 'Pemeliharaan berhasil disetujui.'
									: 'Pemeliharaan ditolak.'
						});
						await invalidateAll();
					} else if (result.type === 'failure') {
						toast.destructive('Gagal memproses', {
							description: (result.data?.message as string) || 'Terjadi kesalahan.'
						});
					}
				};
			}}
		>
			<Dialog.Header>
				<Dialog.Title class="text-lg font-bold text-slate-900">
					{actionType === 'approve' ? 'Setujui Pemeliharaan' : 'Tolak Pemeliharaan'}
				</Dialog.Title>
				<Dialog.Description class="text-sm">
					Tindakan ini akan memverifikasi hasil pemeliharaan untuk alat: <br />
					<strong>{selectedApproval?.maintenance?.equipment?.item?.name || 'Tanpa Nama'}</strong>
				</Dialog.Description>
			</Dialog.Header>

			<input type="hidden" name="approvalId" value={selectedApproval?.id} />
			<input type="hidden" name="action" value={actionType} />

			<div class="space-y-4 py-4">
				{#if actionType === 'reject' && !selectedApproval?.maintenance?.notaFileName}
					<div
						class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
					>
						<AlertTriangle class="mt-0.5 size-4 shrink-0 text-amber-600" />
						<p>Perhatian: Pemeliharaan ini tidak memiliki nota terlampir.</p>
					</div>
				{/if}

				<div class="space-y-1.5">
					<Label for="note">Catatan / Komentar {actionType === 'reject' ? '*' : '(Opsional)'}</Label
					>
					<Textarea
						id="note"
						name="note"
						placeholder={actionType === 'reject'
							? 'Berikan alasan penolakan...'
							: 'Komentar tambahan...'}
						required={actionType === 'reject'}
						class="h-20 resize-none text-xs"
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					disabled={isSubmitting}
					onclick={() => (isDialogOpen = false)}
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isSubmitting}
					class={actionType === 'approve'
						? 'bg-[#2D5A43] text-white hover:bg-[#234735]'
						: 'bg-red-600 text-white hover:bg-red-700'}
				>
					{isSubmitting ? 'Memproses...' : actionType === 'approve' ? 'Setujui' : 'Tolak'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
