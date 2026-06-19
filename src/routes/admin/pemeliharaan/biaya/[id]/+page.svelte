<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ArrowLeft, Edit, FileText, Download, Calendar, ExternalLink } from '@lucide/svelte';

	let { data } = $props();
	const { cost } = data;

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(date: string | Date | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'long'
		}).format(new Date(date));
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'LUNAS':
				return 'bg-emerald-50 text-emerald-700 border-emerald-100';
			case 'MENUNGGU_PEMBAYARAN':
				return 'bg-amber-50 text-amber-700 border-amber-100';
			default:
				return 'bg-slate-50 text-slate-700 border-slate-100';
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-8 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<Button href="/admin/pemeliharaan?tab=biaya" variant="ghost" size="icon">
				<ArrowLeft size={20} />
			</Button>
			<div>
				<h1 class="text-2xl font-bold text-slate-900">{cost.name}</h1>
				<p class="text-sm text-slate-500">Detail rincian analisis biaya pemeliharaan.</p>
			</div>
		</div>
		<Button
			href="/admin/pemeliharaan/biaya/{cost.id}/edit"
			class="gap-2 bg-[#2D5A43] text-white hover:bg-[#234735]"
		>
			<Edit size={18} />
			Edit Data
		</Button>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Summary Info -->
		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Informasi Utama</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">
							Status Pembayaran
						</p>
						<Badge variant="outline" class="mt-1 px-3 py-1 {getStatusColor(cost.status)}">
							{cost.status.replace('_', ' ')}
						</Badge>
					</div>
					<div>
						<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">
							Tanggal Dicatat
						</p>
						<p class="mt-1 font-medium text-slate-900">{formatDate(cost.createdAt)}</p>
					</div>
					<div>
						<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">Jatuh Tempo</p>
						<p class="mt-1 font-medium text-slate-900">{formatDate(cost.dueDate)}</p>
					</div>
					<div>
						<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">Total Biaya</p>
						<p class="mt-1 text-xl font-bold text-[#2D5A43]">{formatCurrency(cost.amount)}</p>
					</div>
				</div>

				<Separator />

				<div>
					<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">
						Terkait Maintenance
					</p>
					{#if cost.maintenance}
						<div class="mt-2 rounded-lg border bg-slate-50 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="font-bold text-slate-900">{cost.maintenance.equipment?.item?.name}</p>
									<p class="text-xs text-slate-500 uppercase">
										{cost.maintenance.maintenanceType} • {formatDate(
											cost.maintenance.scheduledDate
										)}
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									href="/admin/pemeliharaan/{cost.maintenance.id}"
									class="h-8 text-xs"
								>
									Lihat Maintenance
								</Button>
							</div>
						</div>
					{:else}
						<p class="mt-1 text-sm text-slate-500 italic">Tidak terkait maintenance spesifik.</p>
					{/if}
				</div>

				{#if cost.notes}
					<div>
						<p class="text-xs font-medium tracking-wider text-slate-400 uppercase">
							Keterangan Umum
						</p>
						<p class="mt-1 text-sm leading-relaxed text-slate-600">{cost.notes}</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Attachment -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Lampiran Bukti</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if cost.attachmentPath}
					<div class="flex flex-col items-center gap-4">
						<div class="flex w-full justify-center rounded-xl bg-slate-100 p-6 text-slate-400">
							<FileText size={64} strokeWidth={1} />
						</div>
						<div class="w-full text-center">
							<p
								class="mb-1 truncate text-sm font-semibold text-slate-700"
								title={cost.attachmentName}
							>
								{cost.attachmentName || 'lampiran-bukti'}
							</p>
							<p class="text-[10px] text-slate-400 uppercase">Dokumen Bukti Pembayaran</p>
						</div>
						<div class="mt-2 flex w-full flex-col gap-2">
							<Button
								variant="outline"
								href={cost.attachmentPath}
								target="_blank"
								class="h-9 w-full gap-2 text-xs"
							>
								<ExternalLink size={14} />
								Buka File
							</Button>
							<Button
								variant="secondary"
								href={cost.attachmentPath}
								download={cost.attachmentName}
								class="h-9 w-full gap-2 text-xs"
							>
								<Download size={14} />
								Unduh File
							</Button>
						</div>
					</div>
				{:else}
					<div
						class="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-slate-50/50 text-slate-400"
					>
						<FileText size={32} strokeWidth={1} class="mb-2 opacity-50" />
						<p class="text-xs">Tidak ada lampiran</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Cost Breakdown -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Rincian Item Biaya</Card.Title>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-y bg-slate-50">
						<tr>
							<th class="px-6 py-3 font-semibold text-slate-900">Nama Item</th>
							<th class="px-6 py-3 font-semibold text-slate-900">Catatan</th>
							<th class="px-6 py-3 text-right font-semibold text-slate-900">Nominal</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each cost.items as item (item.id)}
							<tr class="transition-colors hover:bg-slate-50/50">
								<td class="px-6 py-4 font-medium text-slate-900">{item.name}</td>
								<td class="max-w-xs px-6 py-4 text-slate-500">
									<p class="truncate" title={item.notes}>{item.notes || '-'}</p>
								</td>
								<td class="px-6 py-4 text-right font-bold text-slate-900">
									{formatCurrency(item.amount)}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="px-6 py-8 text-center text-slate-400">
									Tidak ada rincian item.
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot class="border-t bg-slate-50 font-bold">
						<tr>
							<td colspan="2" class="px-6 py-4 tracking-wider text-slate-900 uppercase"
								>Total Keseluruhan</td
							>
							<td class="px-6 py-4 text-right text-lg text-[#2D5A43]"
								>{formatCurrency(cost.amount)}</td
							>
						</tr>
					</tfoot>
				</table>
			</div>
		</Card.Content>
	</Card.Root>
</div>
