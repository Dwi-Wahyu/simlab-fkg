<script lang="ts">
	import {
		History,
		User,
		Table as TableIcon,
		Activity,
		Search,
		Calendar,
		Info
	} from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import Modal from '$lib/components/Modal.svelte';

	let { data } = $props();

	const logs = $derived(data.logs);
	let selectedLog = $state<any>(null);
	let isModalOpen = $state(false);

	function formatDate(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getActionColor(action: string) {
		const a = (action || '').toLowerCase();
		if (a.includes('create') || a.includes('insert'))
			return 'bg-emerald-50 text-emerald-700 border-emerald-100';
		if (a.includes('update') || a.includes('edit'))
			return 'bg-blue-50 text-blue-700 border-blue-100';
		if (a.includes('delete')) return 'bg-red-50 text-red-700 border-red-100';
		return 'bg-slate-50 text-slate-700 border-slate-100';
	}

	function showDetail(log: any) {
		selectedLog = log;
		isModalOpen = true;
	}

	function formatJson(json: string | null) {
		if (!json || json === 'null') return '-';
		try {
			// Jika sudah object, stringify saja
			if (typeof json === 'object') return JSON.stringify(json, null, 2);

			// Jika string, coba parse
			const obj = JSON.parse(json);
			return JSON.stringify(obj, null, 2);
		} catch (e) {
			return json;
		}
	}
</script>

<div class="space-y-8 p-8">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-slate-900">Audit Log Sistem</h1>
			<p class="mt-1 text-slate-500">Memantau seluruh aktivitas perubahan data dalam sistem</p>
		</div>

		<div class="flex gap-3">
			<div class="relative">
				<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
				<input
					type="text"
					placeholder="Cari aksi, tabel..."
					class="w-64 rounded-lg border border-slate-200 bg-white py-2 pr-4 pl-10 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
				/>
			</div>
			<button
				class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
			>
				<Calendar size={16} />
				Filter Tanggal
			</button>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<Table.Root>
			<Table.Header class="bg-slate-50/50">
				<Table.Row>
					<Table.Head>Waktu</Table.Head>
					<Table.Head>Pengguna</Table.Head>
					<Table.Head>Aksi</Table.Head>
					<Table.Head>Tabel</Table.Head>
					<Table.Head>ID Record</Table.Head>
					<!-- <Table.Head class="text-right">Detail</Table.Head> -->
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each logs as log (log.id)}
					<Table.Row class="transition-colors hover:bg-slate-50/50">
						<Table.Cell class="font-medium text-slate-600">
							<div class="flex flex-col">
								<span class="text-slate-900">{formatDate(log.createdAt)}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
								>
									<User size={14} />
								</div>
								<div class="flex flex-col">
									<span class="text-sm font-semibold text-slate-900"
										>{log.userName || 'System'}</span
									>
									<span class="font-mono text-[10px] text-slate-400">{log.userEmail || ''}</span>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class={getActionColor(log.action || '')}>
								{log.action}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2 text-slate-600">
								<TableIcon size={14} class="text-slate-400" />
								<span class="font-mono text-xs">{log.tableName}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<span class="font-mono text-[10px] text-slate-400">{log.recordId || '-'}</span>
						</Table.Cell>
						<!-- <Table.Cell class="text-right">
							<button
								onclick={() => showDetail(log)}
								class="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
							>
								<Activity size={16} title="Lihat Perubahan" />
							</button>
						</Table.Cell> -->
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-64 text-center">
							<div class="flex flex-col items-center justify-center text-slate-400 gap-2">
								<History size={48} strokeWidth={1} />
								<p>Belum ada log aktivitas yang tercatat</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<div class="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-4">
			<span class="text-xs font-medium text-slate-500 italic"
				>Menampilkan 100 aktivitas terbaru</span
			>
			<div class="flex gap-2">
				<button
					disabled
					class="cursor-not-allowed rounded border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-400"
					>Previous</button
				>
				<button
					disabled
					class="cursor-not-allowed rounded border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-400"
					>Next</button
				>
			</div>
		</div>
	</div>
</div>

<Modal
	bind:show={isModalOpen}
	title="Detail Perubahan Data"
	description="Berikut adalah detail data sebelum dan sesudah perubahan."
>
	{#if selectedLog}
		<div class="custom-scrollbar max-h-[60vh] space-y-6 overflow-y-auto pr-2">
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<TableIcon size={12} /> Tabel
					</p>
					<p class="font-mono font-bold text-slate-900">{selectedLog.tableName}</p>
				</div>
				<div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<Activity size={12} /> Aksi
					</p>
					<Badge variant="outline" class={getActionColor(selectedLog.action)}>
						{selectedLog.action}
					</Badge>
				</div>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p
						class="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						Nilai Lama
					</p>
				</div>
				<div class="group relative">
					<pre
						class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 shadow-inner">
						{formatJson(selectedLog.oldValue)}
					</pre>
				</div>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p
						class="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase"
					>
						<span class="h-2 w-2 rounded-full bg-blue-500"></span>
						Nilai Baru
					</p>
				</div>
				<div class="group relative">
					<pre
						class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-blue-400 shadow-inner">
						{formatJson(selectedLog.newValue)}
					</pre>
				</div>
			</div>
		</div>
	{/if}
</Modal>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #e2e8f0;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #cbd5e1;
	}
</style>
