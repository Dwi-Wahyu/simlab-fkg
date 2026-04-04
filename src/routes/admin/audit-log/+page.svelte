<script lang="ts">
	import {
		History,
		User,
		Table as TableIcon,
		Activity,
		Search,
		Calendar,
		Info,
		ShieldAlert,
		LogIn,
		RefreshCw,
		AlertTriangle,
		Eye,
		Filter,
		X
	} from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import Modal from '$lib/components/Modal.svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const logs = $derived(data.logs);
	const summary = $derived(data.summary);
	const menus = $derived(data.filters.menus);

	let selectedLog = $state<any>(null);
	let isModalOpen = $state(false);

	// Filter states
	let startDate = $state(page.url.searchParams.get('startDate') || '');
	let endDate = $state(page.url.searchParams.get('endDate') || '');
	let selectedRole = $state(page.url.searchParams.get('role') || 'ALL');
	let selectedMenu = $state(page.url.searchParams.get('menu') || 'ALL');
	let selectedAction = $state(page.url.searchParams.get('action') || 'ALL');

	const tableLabels: Record<string, string> = {
		laboratorium: 'Laboratorium',
		user: 'Pengguna',
		equipment: 'Inventori Alat',
		item: 'Katalog Barang',
		stock: 'Stok Barang',
		movement: 'Mutasi Barang',
		maintenance: 'Pemeliharaan',
		lending: 'Peminjaman',
		waste_log: 'Limbah Medis',
		audit_checklist: 'Audit Mutu',
		notification: 'Notifikasi',
		approval: 'Persetujuan',
		safety_incident: 'Insiden Keselamatan',
		practicum_schedule: 'Jadwal Praktikum',
		practicum_class: 'Kelas Praktikum',
		practicum_module: 'Modul Praktikum',
		practicum_assessment: 'Penilaian Praktikum',
		warehouse: 'Gudang'
	};

	const roleLabels: Record<string, string> = {
		superadmin: 'Superadmin',
		kakomlek: 'Koordinator',
		kepalaLab: 'Kepala Lab',
		instruktur: 'Instruktur',
		peneliti: 'Peneliti',
		staff: 'Staff',
		teknisi: 'Teknisi',
		spmi: 'SPMI'
	};

	function formatDate(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getActionLabel(action: string) {
		const a = (action || '').toUpperCase();
		if (a.includes('CREATE') || a.includes('INSERT')) return 'Dibuat';
		if (a.includes('UPDATE') || a.includes('EDIT')) return 'Diperbarui';
		if (a.includes('DELETE')) return 'Dihapus';
		if (a.includes('LOGIN')) return 'Login';
		if (a.includes('LOGOUT')) return 'Logout';
		return action;
	}

	function getActionColor(action: string) {
		const a = (action || '').toUpperCase();
		if (a.includes('CREATE') || a.includes('INSERT'))
			return 'bg-emerald-50 text-emerald-700 border-emerald-100';
		if (a.includes('UPDATE') || a.includes('EDIT'))
			return 'bg-blue-50 text-blue-700 border-blue-100';
		if (a.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-100';
		return 'bg-slate-50 text-slate-700 border-slate-100';
	}

	function showDetail(log: any) {
		selectedLog = log;
		isModalOpen = true;
	}

	function formatJson(json: string | null) {
		if (!json || json === 'null') return '-';
		try {
			if (typeof json === 'object') return JSON.stringify(json, null, 2);
			const obj = JSON.parse(json);
			return JSON.stringify(obj, null, 2);
		} catch (e) {
			return json;
		}
	}

	async function applyFilters() {
		const query = new URLSearchParams();
		if (startDate) query.set('startDate', startDate);
		if (endDate) query.set('endDate', endDate);
		if (selectedRole !== 'ALL') query.set('role', selectedRole);
		if (selectedMenu !== 'ALL') query.set('menu', selectedMenu);
		if (selectedAction !== 'ALL') query.set('action', selectedAction);

		await goto(`?${query.toString()}`, { keepFocus: true });
	}

	async function resetFilters() {
		startDate = '';
		endDate = '';
		selectedRole = 'ALL';
		selectedMenu = 'ALL';
		selectedAction = 'ALL';
		await goto('?', { keepFocus: true });
	}
</script>

<div class="space-y-8 p-8">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-slate-900">Audit Log Sistem</h1>
			<p class="mt-1 text-slate-500">Memantau seluruh aktivitas perubahan data dalam sistem</p>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root class="border-slate-200 bg-white shadow-sm">
			<Card.Content class="p-6">
				<div class="flex items-center gap-4">
					<div class="rounded-full bg-blue-100 p-3 text-blue-600">
						<Activity size={24} />
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Aktivitas Hari Ini</p>
						<h3 class="text-2xl font-bold text-slate-900">{summary.todayActivities}</h3>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-200 bg-white shadow-sm">
			<Card.Content class="p-6">
				<div class="flex items-center gap-4">
					<div class="rounded-full bg-red-100 p-3 text-red-600">
						<ShieldAlert size={24} />
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Login Gagal</p>
						<h3 class="text-2xl font-bold text-slate-900">{summary.failedLogins}</h3>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-200 bg-white shadow-sm">
			<Card.Content class="p-6">
				<div class="flex items-center gap-4">
					<div class="rounded-full bg-emerald-100 p-3 text-emerald-600">
						<RefreshCw size={24} />
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Update Data</p>
						<h3 class="text-2xl font-bold text-slate-900">{summary.dataUpdates}</h3>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-slate-200 bg-white shadow-sm">
			<Card.Content class="p-6">
				<div class="flex items-center gap-4">
					<div class="rounded-full bg-orange-100 p-3 text-orange-600">
						<AlertTriangle size={24} />
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Aksi Resiko Tinggi</p>
						<h3 class="text-2xl font-bold text-slate-900">{summary.highRiskActions}</h3>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filters -->
	<Card.Root class="border-slate-200 bg-white shadow-sm">
		<Card.Header class="pb-3">
			<Card.Title class="flex items-center gap-2 text-lg">
				<Filter size={18} />
				Filter Pencarian
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
				<div class="space-y-2">
					<label for="startDate" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Mulai</label>
					<Input id="startDate" type="date" bind:value={startDate} class="w-full" />
				</div>
				<div class="space-y-2">
					<label for="endDate" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Akhir</label>
					<Input id="endDate" type="date" bind:value={endDate} class="w-full" />
				</div>
				<div class="space-y-2">
					<label for="role-select" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</label>
					<Select.Root type="single" bind:value={selectedRole}>
						<Select.Trigger id="role-select" class="w-full">
							{roleLabels[selectedRole] || 'Semua Role'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="ALL">Semua Role</Select.Item>
							{#each Object.entries(roleLabels) as [val, label] (val)}
								<Select.Item value={val}>{label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<label for="menu-select" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</label>
					<Select.Root type="single" bind:value={selectedMenu}>
						<Select.Trigger id="menu-select" class="w-full">
							{tableLabels[selectedMenu] || 'Semua Menu'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="ALL">Semua Menu</Select.Item>
							{#each menus as menu (menu)}
								<Select.Item value={menu}>{tableLabels[menu] || menu}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<label for="action-select" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</label>
					<Select.Root type="single" bind:value={selectedAction}>
						<Select.Trigger id="action-select" class="w-full">
							{selectedAction === 'ALL' ? 'Semua Aksi' : selectedAction === 'CREATE' ? 'Dibuat' : selectedAction === 'UPDATE' ? 'Diperbarui' : 'Dihapus'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="ALL">Semua Aksi</Select.Item>
							<Select.Item value="CREATE">Dibuat</Select.Item>
							<Select.Item value="UPDATE">Diperbarui</Select.Item>
							<Select.Item value="DELETE">Dihapus</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div class="mt-6 flex justify-end gap-3">
				<Button variant="outline" size="sm" onclick={resetFilters}>
					<X size={16} class="mr-2" />
					Reset
				</Button>
				<Button size="sm" onclick={applyFilters}>
					<Search size={16} class="mr-2" />
					Cari Aktivitas
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<Table.Root>
			<Table.Header class="bg-slate-50/50">
				<Table.Row>
					<Table.Head>Tanggal & Waktu</Table.Head>
					<Table.Head>Pengguna</Table.Head>
					<Table.Head>Menu</Table.Head>
					<Table.Head>Aksi</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>IP Device</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
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
									<span class="text-[10px] text-slate-400 font-medium">{roleLabels[log.userRole] || log.userRole || ''}</span>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2 text-slate-600">
								<TableIcon size={14} class="text-slate-400" />
								<span class="text-sm font-medium">{tableLabels[log.tableName] || log.tableName}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class={getActionColor(log.action || '')}>
								{getActionLabel(log.action || '')}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							{#if log.status === 'FAILED'}
								<Badge variant="outline" class="bg-red-50 text-red-700 border-red-100">Gagal</Badge>
							{:else}
								<Badge variant="outline" class="bg-emerald-50 text-emerald-700 border-emerald-100">Berhasil</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<span class="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{log.ipAddress || '0.0.0.0'}</span>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="ghost"
								size="icon"
								onclick={() => showDetail(log)}
								class="text-slate-400 hover:text-slate-900"
							>
								<Eye size={18} />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={7} class="h-64 text-center">
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
				>Menampilkan {logs.length} aktivitas terbaru</span
			>
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

			{#if selectedLog.userAgent}
				<div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<Info size={12} /> User Agent
					</p>
					<p class="font-mono text-[10px] text-slate-600 leading-tight">{selectedLog.userAgent}</p>
				</div>
			{/if}

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
