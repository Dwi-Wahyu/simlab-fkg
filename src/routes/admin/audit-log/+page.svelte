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
		X,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		XCircle
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
	import { untrack } from 'svelte';

	let { data } = $props();

	let selectedLog = $state<any>(null);
	let isModalOpen = $state(false);

	// Filter states initialized from URL params
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
		kakomlek: 'PJ Mata Kuliah',
		koordinator: 'PJ Mata Kuliah',
		kepalaLab: 'Kepala Lab',
		instruktur: 'DPJP',
		peneliti: 'Mahasiswa',
		staff: 'Staff',
		teknisi: 'Teknisi',
		spmi: 'SPMI',
		laboran: 'Laboran'
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
			return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30';
		if (a.includes('UPDATE') || a.includes('EDIT'))
			return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900/30';
		if (a.includes('DELETE'))
			return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900/30';
		return 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-zinc-800/30 dark:text-zinc-300 dark:border-zinc-800';
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

	function updateUrl(params: Record<string, string | number | undefined>) {
		const url = new URL(page.url);
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === '' || value === 'ALL') {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, value.toString());
			}
		});
		goto(url.toString(), { keepFocus: true, scroll: false });
	}

	function handlePageChange(newPage: number) {
		updateUrl({ page: newPage });
	}

	function handleLimitChange(newLimit: string) {
		updateUrl({ limit: newLimit, page: 1 });
	}

	function applyFilters() {
		updateUrl({
			startDate,
			endDate,
			role: selectedRole,
			menu: selectedMenu,
			action: selectedAction,
			page: 1
		});
	}

	function resetFilters() {
		startDate = '';
		endDate = '';
		selectedRole = 'ALL';
		selectedMenu = 'ALL';
		selectedAction = 'ALL';
		goto('?', { keepFocus: true });
	}

	// Keep internal filter state reactive with URL change
	$effect(() => {
		const urlStart = page.url.searchParams.get('startDate') || '';
		const urlEnd = page.url.searchParams.get('endDate') || '';
		const urlRole = page.url.searchParams.get('role') || 'ALL';
		const urlMenu = page.url.searchParams.get('menu') || 'ALL';
		const urlAction = page.url.searchParams.get('action') || 'ALL';

		untrack(() => {
			if (startDate !== urlStart) startDate = urlStart;
			if (endDate !== urlEnd) endDate = urlEnd;
			if (selectedRole !== urlRole) selectedRole = urlRole;
			if (selectedMenu !== urlMenu) selectedMenu = urlMenu;
			if (selectedAction !== urlAction) selectedAction = urlAction;
		});
	});
</script>

<div class="space-y-8 p-4 md:p-8">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-zinc-50">
				Audit Log Sistem
			</h1>
			<p class="mt-1 text-slate-500 dark:text-zinc-400">
				Memantau seluruh aktivitas perubahan data dalam sistem
			</p>
		</div>
	</div>

	{#await data.logsPromise}
		<!-- SKELETON LOADER -->
		<!-- Skeleton Summary Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each Array(4) as _}
				<Card.Root
					class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
				>
					<Card.Content>
						<div class="flex items-center gap-4">
							<div class="h-12 w-12 animate-pulse rounded-full bg-slate-200 dark:bg-zinc-800"></div>
							<div class="flex-grow space-y-2">
								<div class="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-zinc-800"></div>
								<div class="h-7 w-12 animate-pulse rounded bg-slate-200 dark:bg-zinc-800"></div>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Skeleton Filters -->
		<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			<Card.Header class="pb-3">
				<div class="h-6 w-36 animate-pulse rounded bg-slate-200 dark:bg-zinc-800"></div>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
					{#each Array(5) as _}
						<div class="space-y-2">
							<div class="h-3 w-16 animate-pulse rounded bg-slate-100 dark:bg-zinc-900"></div>
							<div class="h-10 w-full animate-pulse rounded-md bg-slate-200 dark:bg-zinc-800"></div>
						</div>
					{/each}
				</div>
				<div class="flex justify-end gap-3">
					<div class="h-9 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-zinc-800"></div>
					<div class="h-9 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-zinc-800"></div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Skeleton Table -->
		<div
			class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
		>
			<Table.Root>
				<Table.Header class="bg-slate-50/50 dark:bg-zinc-900/50">
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
					{#each Array(5) as _}
						<Table.Row>
							{#each Array(7) as _}
								<Table.Cell>
									<div class="h-5 w-full animate-pulse rounded bg-slate-100 dark:bg-zinc-900"></div>
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:then res}
		<!-- RESOLVED STATE -->
		<!-- Summary Cards -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<Card.Content>
					<div class="flex items-center gap-4">
						<div
							class="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
						>
							<Activity size={24} />
						</div>
						<div>
							<p class="text-sm font-medium text-slate-500 dark:text-zinc-400">
								Aktivitas Hari Ini
							</p>
							<h3 class="dark:text-zinc-550 text-2xl font-bold text-slate-900">
								{res.summary.todayActivities}
							</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<Card.Content>
					<div class="flex items-center gap-4">
						<div class="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-950 dark:text-red-400">
							<ShieldAlert size={24} />
						</div>
						<div>
							<p class="text-sm font-medium text-slate-500 dark:text-zinc-400">Login Gagal</p>
							<h3 class="dark:text-zinc-550 text-2xl font-bold text-slate-900">
								{res.summary.failedLogins}
							</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<Card.Content>
					<div class="flex items-center gap-4">
						<div
							class="rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
						>
							<RefreshCw size={24} />
						</div>
						<div>
							<p class="text-sm font-medium text-slate-500 dark:text-zinc-400">Update Data</p>
							<h3 class="dark:text-zinc-550 text-2xl font-bold text-slate-900">
								{res.summary.dataUpdates}
							</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<Card.Content>
					<div class="flex items-center gap-4">
						<div
							class="rounded-full bg-orange-100 p-3 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
						>
							<AlertTriangle size={24} />
						</div>
						<div>
							<p class="text-sm font-medium text-slate-500 dark:text-zinc-400">
								Aksi Resiko Tinggi
							</p>
							<h3 class="dark:text-zinc-550 text-2xl font-bold text-slate-900">
								{res.summary.highRiskActions}
							</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Filters -->
		<Card.Root class="border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			<Card.Header class="pb-3">
				<Card.Title class="flex items-center gap-2 text-lg text-slate-900 dark:text-zinc-100">
					<Filter size={18} />
					Filter Pencarian
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
					<div class="space-y-2">
						<label
							for="startDate"
							class="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-zinc-400"
							>Tanggal Mulai</label
						>
						<Input id="startDate" type="date" bind:value={startDate} class="w-full" />
					</div>
					<div class="space-y-2">
						<label
							for="endDate"
							class="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-zinc-400"
							>Tanggal Akhir</label
						>
						<Input id="endDate" type="date" bind:value={endDate} class="w-full" />
					</div>
					<div class="space-y-2">
						<label
							for="role-select"
							class="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-zinc-400"
							>Role</label
						>
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
						<label
							for="menu-select"
							class="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-zinc-400"
							>Menu</label
						>
						<Select.Root type="single" bind:value={selectedMenu}>
							<Select.Trigger id="menu-select" class="w-full">
								{tableLabels[selectedMenu] || 'Semua Menu'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="ALL">Semua Menu</Select.Item>
								{#each res.filters.menus as menu (menu)}
									<Select.Item value={menu}>{tableLabels[menu] || menu}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<label
							for="action-select"
							class="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-zinc-400"
							>Aksi</label
						>
						<Select.Root type="single" bind:value={selectedAction}>
							<Select.Trigger id="action-select" class="w-full">
								{selectedAction === 'ALL'
									? 'Semua Aksi'
									: selectedAction === 'CREATE'
										? 'Dibuat'
										: selectedAction === 'UPDATE'
											? 'Diperbarui'
											: 'Dihapus'}
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
				<div class="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
					<div class="flex w-full items-center gap-2 sm:w-auto">
						<Select.Root
							type="single"
							value={res.pagination.limit.toString()}
							onValueChange={handleLimitChange}
						>
							<Select.Trigger class="w-[100px]">
								{res.pagination.limit} / Hal
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="10" label="10 / Halaman">10 / Hal</Select.Item>
								<Select.Item value="25" label="25 / Halaman">25 / Hal</Select.Item>
								<Select.Item value="50" label="50 / Halaman">50 / Hal</Select.Item>
								<Select.Item value="100" label="100 / Halaman">100 / Hal</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex w-full justify-end gap-3 sm:w-auto">
						<Button variant="outline" size="sm" onclick={resetFilters}>
							<X size={16} class="mr-2" />
							Reset
						</Button>
						<Button size="sm" onclick={applyFilters}>
							<Search size={16} class="mr-2" />
							Cari Aktivitas
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Data Table -->
		<div
			class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
		>
			<Table.Root>
				<Table.Header class="bg-slate-50/50 dark:bg-zinc-900/50">
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
					{#each res.logs as log (log.id)}
						<Table.Row class="transition-colors hover:bg-slate-50/50 dark:hover:bg-zinc-900/30">
							<Table.Cell class="font-medium text-slate-600 dark:text-zinc-300">
								<div class="flex flex-col">
									<span class="text-slate-900 dark:text-zinc-100">{formatDate(log.createdAt)}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-zinc-900 dark:text-zinc-400"
									>
										<User size={14} />
									</div>
									<div class="flex flex-col">
										<span class="text-sm font-semibold text-slate-900 dark:text-zinc-100"
											>{log.userName || 'System'}</span
										>
										<span class="text-[10px] font-medium text-slate-400 dark:text-zinc-500"
											>{roleLabels[log.userRole] || log.userRole || ''}</span
										>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
									<TableIcon size={14} class="text-slate-400" />
									<span class="text-sm font-medium"
										>{tableLabels[log.tableName] || log.tableName}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline" class={getActionColor(log.action || '')}>
									{getActionLabel(log.action || '')}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if log.status === 'FAILED'}
									<Badge
										variant="outline"
										class="border-red-100 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300"
										>Gagal</Badge
									>
								{:else}
									<Badge
										variant="outline"
										class="border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300"
										>Berhasil</Badge
									>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<span
									class="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-zinc-900 dark:text-zinc-400"
									>{log.ipAddress || '0.0.0.0'}</span
								>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="icon"
									onclick={() => showDetail(log)}
									class="text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"
								>
									<Eye size={18} />
								</Button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={7} class="h-64 text-center">
								<div
									class="flex flex-col items-center justify-center text-slate-400 gap-2 dark:text-zinc-500"
								>
									<History size={48} strokeWidth={1} />
									<p>Belum ada log aktivitas yang tercatat</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>

			<!-- Pagination Footer -->
			<div
				class="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/30 p-4 sm:flex-row dark:border-zinc-800 dark:bg-zinc-900/30"
			>
				<div class="text-xs font-semibold text-slate-500 dark:text-zinc-400">
					Menampilkan {res.logs.length > 0
						? (res.pagination.currentPage - 1) * res.pagination.limit + 1
						: 0}-{Math.min(
						res.pagination.totalItems,
						res.pagination.currentPage * res.pagination.limit
					)} dari {res.pagination.totalItems} aktivitas
				</div>
				<div class="flex items-center space-x-2">
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex"
						onclick={() => handlePageChange(1)}
						disabled={res.pagination.currentPage === 1}
					>
						<ChevronsLeft class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						onclick={() => handlePageChange(res.pagination.currentPage - 1)}
						disabled={res.pagination.currentPage === 1}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<div
						class="flex items-center justify-center text-sm font-medium text-slate-700 dark:text-zinc-300"
					>
						Halaman {res.pagination.currentPage} dari {res.pagination.totalPages}
					</div>
					<Button
						variant="outline"
						size="icon"
						class="h-8 w-8"
						onclick={() => handlePageChange(res.pagination.currentPage + 1)}
						disabled={res.pagination.currentPage === res.pagination.totalPages ||
							res.pagination.totalPages === 0}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						class="hidden h-8 w-8 lg:flex"
						onclick={() => handlePageChange(res.pagination.totalPages)}
						disabled={res.pagination.currentPage === res.pagination.totalPages ||
							res.pagination.totalPages === 0}
					>
						<ChevronsRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	{:catch error}
		<Card.Root
			class="border-red-200 bg-red-50 p-8 text-center dark:border-red-950/30 dark:bg-red-950/20"
		>
			<div class="flex flex-col items-center gap-2 text-red-600 dark:text-red-400">
				<XCircle class="h-10 w-10" />
				<h2 class="text-lg font-bold">Gagal Memuat Data</h2>
				<p>{error.message}</p>
				<Button
					onclick={() => window.location.reload()}
					variant="outline"
					class="mt-4 border-red-200 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/45"
				>
					Coba Lagi
				</Button>
			</div>
		</Card.Root>
	{/await}
</div>

<Modal
	bind:show={isModalOpen}
	title="Detail Perubahan Data"
	description="Berikut adalah detail data sebelum dan sesudah perubahan."
>
	{#if selectedLog}
		<div class="custom-scrollbar max-h-[60vh] space-y-6 overflow-y-auto pr-2">
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div
					class="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
				>
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<TableIcon size={12} /> Tabel
					</p>
					<p class="font-mono font-bold text-slate-900 dark:text-zinc-100">
						{selectedLog.tableName}
					</p>
				</div>
				<div
					class="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
				>
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
				<div
					class="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
				>
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<Info size={12} /> User Agent
					</p>
					<p class="font-mono text-[10px] leading-tight text-slate-600 dark:text-zinc-300">
						{selectedLog.userAgent}
					</p>
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
