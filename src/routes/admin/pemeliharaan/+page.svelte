<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import {
		AlertTriangle,
		Box,
		Calendar,
		CheckCircle2,
		ChevronDown,
		ChevronRight,
		ChevronUp,
		DollarSign,
		Edit,
		FileText,
		FileUp,
		Filter,
		Plus,
		Trash2,
		TrendingUp,
		Wrench,
		XCircle
	} from '@lucide/svelte';
	import Input from '@/components/ui/input/input.svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { toast } from '$lib/components/toast';

	let { data } = $props();

	// Tab Persistence Logic

	$effect(() => {
		const tab = page.url.searchParams.get('tab');
		if (tab && tab !== activeTab) {
			activeTab = tab;
		}
	});

	function handleTabChange(value: string) {
		activeTab = value;
		const url = new URL(page.url);
		url.searchParams.set('tab', value);
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	// Real Summary Data
	const summaryStats = $derived([
		{
			title: 'Pemeliharaan Bulan Ini',
			value: data.summary.maintenanceThisMonth.toString(),
			description: 'Tugas pemeliharaan rutin',
			icon: Wrench,
			color: 'text-blue-600',
			bg: 'bg-blue-100'
		},
		{
			title: 'Kalibrasi Terjadwal',
			value: data.summary.upcomingCount.toString().padStart(2, '0'),
			description: 'Dalam 30 hari ke depan',
			icon: Calendar,
			color: 'text-emerald-600',
			bg: 'bg-emerald-100'
		},
		{
			title: 'Kalibrasi Terlambat',
			value: data.summary.overdueCount.toString().padStart(2, '0'),
			description: 'Perlu tindakan segera',
			icon: AlertTriangle,
			color: 'text-red-600',
			bg: 'bg-red-100'
		},
		{
			title: 'Biaya Bulan Ini',
			value: formatCurrency(data.summary.totalCostThisMonth),
			description: 'Realisasi biaya pemeliharaan',
			icon: DollarSign,
			color: 'text-amber-600',
			bg: 'bg-amber-100'
		}
	]);

	let activeTab = $state('pemeliharaan');

	let expandedPemeliharaan = $state<Record<string, boolean>>({});
	let expandedKalibrasi = $state<Record<string, boolean>>({});
	let expandedBiaya = $state<Record<string, boolean>>({});

	// State untuk dialog konfirmasi hapus
	let showDeleteDialog = $state(false);
	let deleteForm: HTMLFormElement | null = $state(null);

	// Handler untuk membuka dialog hapus
	function confirmDelete(formElement: HTMLFormElement) {
		deleteForm = formElement;
		showDeleteDialog = true;
	}

	function handleDelete() {
		if (deleteForm) {
			deleteForm.requestSubmit();
		}
		showDeleteDialog = false;
	}

	function handleCancelDelete() {
		deleteForm = null;
		showDeleteDialog = false;
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'COMPLETED':
			case 'OK':
			case 'LUNAS':
				return 'bg-emerald-50 text-emerald-700 border-emerald-100';
			case 'IN_PROGRESS':
			case 'TERJADWAL':
				return 'bg-blue-50 text-blue-700 border-blue-100';
			case 'PENDING':
			case 'MENUNGGU PEMBAYARAN':
			case 'MENUNGGU_PEMBAYARAN':
				return 'bg-amber-50 text-amber-700 border-amber-100';
			case 'TERLAMBAT':
				return 'bg-red-50 text-red-700 border-red-100';
			default:
				return 'bg-slate-50 text-slate-700 border-slate-100';
		}
	}

	function formatDate(date: string | Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium'
		}).format(new Date(date));
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}

	function getItemApproval(itemId: string) {
		return data.approvals.find((a: any) => a.referenceId === itemId);
	}

	// Inline approval dialog state
	let isApproveDialogOpen = $state(false);
	let selectedApproval = $state<any>(null);
	let approveActionType = $state<'approve' | 'reject'>('approve');
	let approveNote = $state('');
	let isApproveSubmitting = $state(false);

	function openApproveDialog(approval: any, type: 'approve' | 'reject') {
		selectedApproval = approval;
		approveActionType = type;
		approveNote = '';
		isApproveDialogOpen = true;
	}
</script>

<svelte:head>
	<title>Pemeliharaan & Kalibrasi | SIM LAB</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">Pemeliharaan & Kalibrasi</h1>
			<p class="text-slate-500">
				Monitor kesehatan alat laboratorium dan jadwal kalibrasi periodik.
			</p>
		</div>
		{#if ['superadmin', 'kepalaLab'].includes(data.userRole) && data.pendingApprovalsCount > 0}
			<Button
				variant="outline"
				href="/admin/pemeliharaan/approval"
				class="w-full gap-1.5 border-amber-200 font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800 md:w-auto"
			>
				<AlertTriangle class="size-4 animate-pulse text-amber-500" />
				Menunggu Persetujuan ({data.pendingApprovalsCount})
			</Button>
		{/if}
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each summaryStats as stat (stat.title)}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">{stat.title}</Card.Title>
					<stat.icon class="size-4 {stat.color}" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{stat.value}</div>
					<p class="text-xs text-muted-foreground">{stat.description}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<!-- Tabs Area -->
	<Tabs.Root bind:value={activeTab} onValueChange={handleTabChange} class="w-full space-y-4">
		<Tabs.List variant="default" class=" w-full">
			<Tabs.Trigger value="pemeliharaan" class="h-10 cursor-pointer">Pemeliharaan</Tabs.Trigger>
			<Tabs.Trigger value="kalibrasi" class="h-10 cursor-pointer">Kalibrasi</Tabs.Trigger>
			<Tabs.Trigger value="biaya" class="h-10 cursor-pointer">Analisis Biaya</Tabs.Trigger>
		</Tabs.List>

		<Card.Root mobileAware={true}>
			<Card.Header class=" flex flex-col gap-4 pt-0 sm:flex-row sm:items-center sm:justify-between">
				<Card.Title class="hidden text-xl md:block">
					{#if activeTab === 'pemeliharaan'}
						Jadwal Pemeliharaan
					{:else if activeTab === 'kalibrasi'}
						Jadwal Kalibrasi
					{:else}
						Analisis Biaya Pemeliharaan
					{/if}
				</Card.Title>
				<div class="flex w-full flex-col items-center gap-4 sm:w-auto md:flex-row">
					<div class="relative w-full flex-1 md:w-64 md:flex-none">
						<Filter class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
						<Input type="text" placeholder="Cari..." class="w-full pl-9" />
					</div>
					{#if activeTab === 'pemeliharaan'}
						<Button class="w-full md:w-fit" href="/admin/pemeliharaan/create">
							<Plus size={16} />
							Jadwalkan Pemeliharaan
						</Button>
					{:else if activeTab === 'kalibrasi'}
						<Button class="w-full md:w-fit" href="/admin/kalibrasi/baru">
							<Calendar size={16} />
							Jadwalkan Kalibrasi
						</Button>
					{:else}
						<Button class="w-full md:w-fit" href="/admin/pemeliharaan/biaya/baru">
							<TrendingUp size={16} />
							Catat Biaya
						</Button>
					{/if}
				</div>
			</Card.Header>
			<Card.Content class="p-0">
				<!-- Pemeliharaan Content -->
				<Tabs.Content value="pemeliharaan" class="m-0 p-0">
					<div class="overflow-x-auto">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head class="px-6 py-4">Peralatan</Table.Head>
									<Table.Head>Tipe</Table.Head>
									<Table.Head>Jadwal</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#each data.maintenance as item (item.id)}
									<Table.Row
										class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
									>
										<!-- Column 1: Peralatan -->
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
										>
											<div class="flex items-center gap-3">
												<div
													class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
												>
													<Box size={20} />
												</div>
												<div class="flex flex-col">
													<span class="font-bold text-slate-900"
														>{item.equipment?.item?.name ?? item.equipmentId}</span
													>
													<div class="mt-0.5 flex flex-wrap items-center gap-1.5">
														<span class="font-mono text-[10px] text-slate-400"
															>SN: {item.equipment?.serialNumber || '-'}</span
														>
														<Badge
															variant="outline"
															class="border-slate-200 bg-slate-50 text-[9px] font-bold tracking-wider text-slate-600 uppercase md:hidden"
														>
															{item.maintenanceType}
														</Badge>
													</div>
												</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="ml-4 h-8 w-8 shrink-0 md:hidden"
												onclick={() =>
													(expandedPemeliharaan[item.id] = !expandedPemeliharaan[item.id])}
												aria-label="Expand row"
											>
												{#if expandedPemeliharaan[item.id]}
													<ChevronUp class="h-4 w-4" />
												{:else}
													<ChevronDown class="h-4 w-4" />
												{/if}
											</Button>
										</Table.Cell>

										<!-- Column 2: Tipe (hidden on mobile) -->
										<Table.Cell class="hidden border-b-0 p-4 md:table-cell md:border-b md:p-4">
											<Badge
												variant="outline"
												class="border-slate-200 bg-slate-50 text-[10px] font-bold tracking-wider text-slate-600 uppercase"
											>
												{item.maintenanceType}
											</Badge>
										</Table.Cell>

										<!-- Column 3: Jadwal -->
										<Table.Cell
											class="{expandedPemeliharaan[item.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Jadwal</span>
											<span class="text-sm font-medium text-slate-900"
												>{formatDate(item.scheduledDate)}</span
											>
										</Table.Cell>

										<!-- Column 4: Status -->
										<Table.Cell
											class="{expandedPemeliharaan[item.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Status</span>
											<div class="flex flex-col gap-1">
												<Badge
													variant="outline"
													class="w-fit px-3 py-1 {getStatusColor(item.status)}"
												>
													{item.status}
												</Badge>
												{#if item.status === 'COMPLETED'}
													{@const app = getItemApproval(item.id)}
													{#if app}
														<span
															class="mt-1 w-fit rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase
															{app.status === 'APPROVED'
																? 'border-emerald-100 bg-emerald-50 text-emerald-700'
																: app.status === 'REJECTED'
																	? 'border-red-100 bg-red-50 text-red-700'
																	: 'border-amber-100 bg-amber-50 text-amber-700'}"
														>
															{app.status === 'APPROVED'
																? 'Disetujui'
																: app.status === 'REJECTED'
																	? 'Ditolak'
																	: 'Menunggu Review'}
														</span>
													{/if}
												{/if}
											</div>
										</Table.Cell>

										<!-- Column 5: Aksi -->
										<Table.Cell
											class="{expandedPemeliharaan[item.id]
												? 'flex'
												: 'hidden'} justify-end border-b-0 bg-slate-50/50 p-4 pr-6 md:table-cell md:border-b md:bg-transparent md:p-4 md:pr-6 md:text-right"
										>
											<div class="flex w-full justify-end gap-1 md:w-auto">
												{#if getItemApproval(item.id)?.status === 'PENDING' && ['superadmin', 'kepalaLab'].includes(data.userRole)}
													<Button
														size="sm"
														variant="outline"
														class="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
														onclick={() => openApproveDialog(getItemApproval(item.id), 'approve')}
														title="Setujui pemeliharaan"
													>
														<CheckCircle2 size={14} />
														<span class="hidden sm:inline">Setujui</span>
													</Button>
												{/if}
												<Button
													size="icon"
													variant="ghost"
													href="/admin/pemeliharaan/{item.id}/edit"
													class="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
												>
													<Edit size={16} />
												</Button>
												<form
													method="POST"
													action="?/delete"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') await invalidateAll();
															await update();
														};
													}}
												>
													<input type="hidden" name="id" value={item.id} />
													<Button
														size="icon"
														variant="ghost"
														type="button"
														onclick={(e) => confirmDelete(e.currentTarget.form!)}
														class="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
													>
														<Trash2 size={16} />
													</Button>
												</form>
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row class="flex flex-col md:table-row">
										<Table.Cell colspan={5} class="h-64 text-center md:table-cell">
											<div class="flex flex-col items-center justify-center gap-3 text-slate-400">
												<Wrench size={48} strokeWidth={1} class="text-slate-200" />
												<p class="text-sm">Belum ada data pemeliharaan</p>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Tabs.Content>

				<!-- Kalibrasi Content -->
				<Tabs.Content value="kalibrasi" class="m-0 p-0">
					<div class="overflow-x-auto">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head class="px-6 py-4">Peralatan</Table.Head>
									<Table.Head>Terakhir Kalibrasi</Table.Head>
									<Table.Head>Masa Berlaku</Table.Head>
									<Table.Head>Vendor</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#each data.calibrations as cal (cal.id)}
									<Table.Row
										class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
									>
										<!-- Column 1: Peralatan -->
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
										>
											<div class="flex flex-col">
												<span class="font-bold text-slate-900"
													>{cal.equipment?.item?.name || 'Alat'}</span
												>
												<span class="font-mono text-[10px] text-slate-400"
													>{cal.equipment?.serialNumber || '-'}</span
												>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="ml-4 h-8 w-8 shrink-0 md:hidden"
												onclick={() => (expandedKalibrasi[cal.id] = !expandedKalibrasi[cal.id])}
												aria-label="Expand row"
											>
												{#if expandedKalibrasi[cal.id]}
													<ChevronUp class="h-4 w-4" />
												{:else}
													<ChevronDown class="h-4 w-4" />
												{/if}
											</Button>
										</Table.Cell>

										<!-- Column 2: Terakhir Kalibrasi -->
										<Table.Cell
											class="{expandedKalibrasi[cal.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Terakhir Kalibrasi</span
											>
											<span class="text-sm text-slate-600">
												{cal.completionDate ? formatDate(cal.completionDate) : '-'}
											</span>
										</Table.Cell>

										<!-- Column 3: Masa Berlaku -->
										<Table.Cell
											class="{expandedKalibrasi[cal.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Masa Berlaku</span
											>
											<span class="text-sm font-semibold text-slate-900">
												{cal.expiryDate ? formatDate(cal.expiryDate) : '-'}
											</span>
										</Table.Cell>

										<!-- Column 4: Vendor -->
										<Table.Cell
											class="{expandedKalibrasi[cal.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Vendor</span>
											<span class="text-sm text-slate-600">{cal.vendor || '-'}</span>
										</Table.Cell>

										<!-- Column 5: Status -->
										<Table.Cell
											class="{expandedKalibrasi[cal.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Status</span>
											<Badge variant="outline" class="w-fit px-3 py-1 {getStatusColor(cal.status)}">
												{cal.status}
											</Badge>
										</Table.Cell>

										<!-- Column 6: Aksi -->
										<Table.Cell
											class="{expandedKalibrasi[cal.id]
												? 'flex'
												: 'hidden'} justify-end border-b-0 bg-slate-50/50 p-4 pr-6 md:table-cell md:border-b md:bg-transparent md:p-4 md:pr-6 md:text-right"
										>
											<div class="flex w-full justify-end gap-1 md:w-auto">
												{#if cal.certificatePath}
													<Button
														size="icon"
														variant="ghost"
														href={cal.certificatePath}
														target="_blank"
														class="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
														title="Lihat Sertifikat"
													>
														<FileUp size={16} />
													</Button>
												{/if}
												<Button
													size="icon"
													variant="ghost"
													href="/admin/kalibrasi/{cal.id}/edit"
													class="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
												>
													<Edit size={16} />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row class="flex flex-col md:table-row">
										<Table.Cell colspan={6} class="h-64 text-center md:table-cell">
											<div class="flex flex-col items-center justify-center gap-3 text-slate-400">
												<Calendar size={48} strokeWidth={1} class="text-slate-200" />
												<p class="text-sm">Belum ada data kalibrasi</p>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Tabs.Content>

				<!-- Biaya Content -->
				<Tabs.Content value="biaya" class="m-0 p-0">
					<div class="overflow-x-auto">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head class="px-6 py-4">Tanggal</Table.Head>
									<Table.Head>Nama Biaya</Table.Head>
									<Table.Head>Peralatan / Maintenance</Table.Head>
									<Table.Head>Jumlah Biaya</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#each data.costs as cost (cost.id)}
									<Table.Row
										class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
									>
										<!-- Column 1: Nama Biaya (main layout on mobile) -->
										<Table.Cell
											class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
										>
											<div class="flex flex-col">
												<span class="font-bold text-slate-900">{cost.name}</span>
												<span class="mt-0.5 text-xs text-slate-400">
													{formatDate(cost.createdAt)}
												</span>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="ml-4 h-8 w-8 shrink-0 md:hidden"
												onclick={() => (expandedBiaya[cost.id] = !expandedBiaya[cost.id])}
												aria-label="Expand row"
											>
												{#if expandedBiaya[cost.id]}
													<ChevronUp class="h-4 w-4" />
												{:else}
													<ChevronDown class="h-4 w-4" />
												{/if}
											</Button>
										</Table.Cell>

										<!-- Column 2: Tanggal (hidden on mobile, merged above) -->
										<Table.Cell class="hidden border-b-0 p-4 md:table-cell md:border-b md:p-4">
											<span class="text-sm text-slate-600">{formatDate(cost.createdAt)}</span>
										</Table.Cell>

										<!-- Mobile-only Due Date -->
										{#if cost.dueDate}
											<Table.Cell
												class="{expandedBiaya[cost.id]
													? 'flex'
													: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:hidden"
											>
												<span class="text-xs font-semibold text-slate-400">Jatuh Tempo</span>
												<span class="text-sm text-slate-900">{formatDate(cost.dueDate)}</span>
											</Table.Cell>
										{/if}

										<!-- Column 3: Peralatan / Maintenance -->
										<Table.Cell
											class="{expandedBiaya[cost.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Peralatan / Maintenance</span
											>
											{#if cost.maintenance}
												<div class="flex flex-col">
													<span class="text-sm text-slate-700">
														{cost.maintenance.equipment?.item?.name || 'Alat'}
													</span>
													<Badge variant="outline" class="mt-0.5 w-fit text-[9px] uppercase">
														{cost.maintenance.maintenanceType}
													</Badge>
												</div>
											{:else}
												<span class="text-xs text-slate-400 italic">Umum / Tidak Terkait</span>
											{/if}
										</Table.Cell>

										<!-- Column 4: Jumlah Biaya -->
										<Table.Cell
											class="{expandedBiaya[cost.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden"
												>Jumlah Biaya</span
											>
											<span class="font-bold text-slate-900">{formatCurrency(cost.amount)}</span>
										</Table.Cell>

										<!-- Column 5: Status -->
										<Table.Cell
											class="{expandedBiaya[cost.id]
												? 'flex'
												: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
										>
											<span class="text-xs font-semibold text-slate-400 md:hidden">Status</span>
											<Badge
												variant="outline"
												class="w-fit px-3 py-1 {getStatusColor(cost.status)}"
											>
												{cost.status.replace('_', ' ')}
											</Badge>
										</Table.Cell>

										<!-- Column 6: Aksi -->
										<Table.Cell
											class="{expandedBiaya[cost.id]
												? 'flex'
												: 'hidden'} justify-end border-b-0 bg-slate-50/50 p-4 pr-6 md:table-cell md:border-b md:bg-transparent md:p-4 md:pr-6 md:text-right"
										>
											<div class="flex w-full justify-end gap-1 md:w-auto">
												{#if cost.attachmentPath}
													<Button
														size="icon"
														variant="ghost"
														href={cost.attachmentPath}
														target="_blank"
														class="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
														title="Lihat Lampiran"
													>
														<FileUp size={16} />
													</Button>
												{/if}
												<Button
													size="icon"
													variant="ghost"
													href="/admin/pemeliharaan/biaya/{cost.id}"
													class="h-8 w-8 text-slate-400 hover:bg-slate-100"
												>
													<ChevronRight size={16} />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row class="flex flex-col md:table-row">
										<Table.Cell colspan={6} class="h-64 text-center md:table-cell">
											<div class="flex flex-col items-center justify-center gap-3 text-slate-400">
												<DollarSign size={48} strokeWidth={1} class="text-slate-200" />
												<p class="text-sm">Belum ada data analisis biaya</p>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</Tabs.Content>
			</Card.Content>
		</Card.Root>
	</Tabs.Root>

	<!-- Footer Info -->
	<div class="flex items-center justify-between text-xs text-slate-400">
		<p>* Data pemeliharaan disinkronkan dengan modul Inventori.</p>
		<p>
			Terakhir diperbarui: {new Date().toLocaleDateString('id-ID', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})}
		</p>
	</div>
</div>

<!-- Dialog Konfirmasi Hapus -->
<ConfirmationDialog
	bind:open={showDeleteDialog}
	type="error"
	title="Hapus Pemeliharaan"
	description="Apakah Anda yakin ingin menghapus data pemeliharaan ini? Tindakan ini akan menghapus riwayat dari sistem dan tidak dapat dikembalikan."
	cancelLabel="Batal"
	actionLabel="Ya, Hapus"
	onAction={handleDelete}
	onCancel={handleCancelDelete}
/>

<!-- Dialog Persetujuan Inline -->
<Dialog.Root bind:open={isApproveDialogOpen}>
	<Dialog.Content class="sm:max-w-[450px]">
		<form
			method="POST"
			action="/admin/pemeliharaan/approval?/review"
			use:enhance={() => {
				isApproveSubmitting = true;
				return async ({ result }) => {
					isApproveSubmitting = false;
					if (result.type === 'success') {
						isApproveDialogOpen = false;
						toast.success('Persetujuan diproses', {
							description:
								approveActionType === 'approve'
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
					{approveActionType === 'approve' ? 'Setujui Pemeliharaan' : 'Tolak Pemeliharaan'}
				</Dialog.Title>
				<Dialog.Description class="text-sm">
					Tindakan ini akan memverifikasi hasil pemeliharaan untuk alat: <br />
					<strong>{selectedApproval?.maintenance?.equipment?.item?.name || 'Tanpa Nama'}</strong>
				</Dialog.Description>
			</Dialog.Header>

			<input type="hidden" name="approvalId" value={selectedApproval?.id} />
			<input type="hidden" name="action" value={approveActionType} />

			<div class="space-y-4 py-4">
				{#if approveActionType === 'reject' && !selectedApproval?.maintenance?.notaFileName}
					<div
						class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
					>
						<AlertTriangle class="mt-0.5 size-4 shrink-0 text-amber-600" />
						<p>Perhatian: Pemeliharaan ini tidak memiliki nota terlampir.</p>
					</div>
				{/if}
				<div class="space-y-1.5">
					<Label for="approve-note"
						>Catatan / Komentar {approveActionType === 'reject' ? '*' : '(Opsional)'}</Label
					>
					<Textarea
						id="approve-note"
						name="note"
						placeholder={approveActionType === 'reject'
							? 'Berikan alasan penolakan...'
							: 'Komentar tambahan...'}
						required={approveActionType === 'reject'}
						class="h-20 resize-none text-xs"
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					disabled={isApproveSubmitting}
					onclick={() => (isApproveDialogOpen = false)}
				>
					Batal
				</Button>
				<Button
					type="submit"
					disabled={isApproveSubmitting}
					class={approveActionType === 'approve'
						? 'bg-[#2D5A43] text-white hover:bg-[#234735]'
						: 'bg-red-600 text-white hover:bg-red-700'}
				>
					{isApproveSubmitting
						? 'Memproses...'
						: approveActionType === 'approve'
							? 'Setujui'
							: 'Tolak'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
