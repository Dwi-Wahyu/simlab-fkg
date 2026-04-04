<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import {
		Wrench,
		Plus,
		Calendar,
		Trash2,
		Edit,
		Box,
		TrendingUp,
		AlertTriangle,
		DollarSign,
		ChevronRight,
		Filter,
		FileUp
	} from '@lucide/svelte';

	import { page } from '$app/state';
	import { goto } from '$app/navigation';

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

	// State untuk dialog konfirmasi hapus
	let showDeleteDialog = $state(false);
	let deleteId = $state<string | null>(null);
	let deleteForm: HTMLFormElement | null = $state(null);

	// Handler untuk membuka dialog hapus
	function confirmDelete(id: string, formElement: HTMLFormElement) {
		deleteId = id;
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
		deleteId = null;
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
</script>

<svelte:head>
	<title>Pemeliharaan & Kalibrasi | SIM LAB</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-8 p-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">Pemeliharaan & Kalibrasi</h1>
			<p class="text-slate-500">
				Monitor kesehatan alat laboratorium dan jadwal kalibrasi periodik.
			</p>
		</div>

		<div class="flex flex-wrap justify-end gap-2">
			<Button
				variant="outline"
				class="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
				href="/admin/pemeliharaan/biaya/baru"
			>
				<TrendingUp size={18} />
				Catat Biaya
			</Button>
			<Button
				variant="outline"
				class="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
				href="/admin/kalibrasi/baru"
			>
				<Calendar size={18} />
				Jadwalkan Kalibrasi
			</Button>
			<Button
				class="gap-2 bg-[#2D5A43] text-white hover:bg-[#234735]"
				href="/admin/pemeliharaan/create"
			>
				<Plus size={18} />
				Jadwalkan Pemeliharaan
			</Button>
		</div>
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
	<Card.Root>
		<Card.Content class="px-0">
			<Tabs.Root value={activeTab} onValueChange={handleTabChange} class="w-full">
				<div class="flex items-center justify-between px-5">
					<Tabs.List class="h-auto bg-transparent p-0">
						<Tabs.Trigger value="pemeliharaan">Pemeliharaan</Tabs.Trigger>
						<Tabs.Trigger value="kalibrasi">Kalibrasi</Tabs.Trigger>
						<Tabs.Trigger value="biaya">Analisis Biaya</Tabs.Trigger>
					</Tabs.List>

					<div class="flex items-center gap-2 pb-4">
						<div class="relative hidden sm:block">
							<Filter class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={14} />
							<input
								type="text"
								placeholder="Cari..."
								class="w-64 rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pr-4 pl-9 text-xs transition-all focus:border-[#2D5A43] focus:ring-2 focus:ring-[#2D5A43]/10"
							/>
						</div>
					</div>
				</div>

				<!-- Pemeliharaan Content -->
				<Tabs.Content value="pemeliharaan" class="m-0 p-0">
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header class="bg-slate-50/50">
								<Table.Row>
									<Table.Head class="px-6 py-4">Peralatan</Table.Head>
									<Table.Head>Tipe</Table.Head>
									<Table.Head>Jadwal</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.maintenance as item (item.id)}
									<Table.Row class="group transition-colors hover:bg-slate-50/50">
										<Table.Cell class="px-6 py-4">
											<div class="flex items-center gap-3">
												<div
													class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
												>
													<Box size={20} />
												</div>
												<div class="flex flex-col">
													<span class="font-bold text-slate-900"
														>{item.equipment?.item?.name ?? item.equipmentId}</span
													>
													<span class="font-mono text-[10px] text-slate-400"
														>SN: {item.equipment?.serialNumber || '-'}</span
													>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge
												variant="outline"
												class="border-slate-200 bg-slate-50 text-[10px] font-bold tracking-wider text-slate-600 uppercase"
											>
												{item.maintenanceType}
											</Badge>
										</Table.Cell>
										<Table.Cell>
											<span class="text-sm font-medium text-slate-900"
												>{formatDate(item.scheduledDate)}</span
											>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="px-3 py-1 {getStatusColor(item.status)}">
												{item.status}
											</Badge>
										</Table.Cell>
										<Table.Cell class="pr-6 text-right">
											<div class="flex justify-end gap-1">
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
														onclick={() => confirmDelete(item.id, deleteForm!)}
														class="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
													>
														<Trash2 size={16} />
													</Button>
												</form>
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={5} class="h-64 text-center">
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
						<Table.Root>
							<Table.Header class="bg-slate-50/50">
								<Table.Row>
									<Table.Head class="px-6 py-4">Peralatan</Table.Head>
									<Table.Head>Terakhir Kalibrasi</Table.Head>
									<Table.Head>Masa Berlaku</Table.Head>
									<Table.Head>Vendor</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.calibrations as cal (cal.id)}
									<Table.Row class="group transition-colors hover:bg-slate-50/50">
										<Table.Cell class="px-6 py-4">
											<div class="flex flex-col">
												<span class="font-bold text-slate-900"
													>{cal.equipment?.item?.name || 'Alat'}</span
												>
												<span class="font-mono text-[10px] text-slate-400"
													>{cal.equipment?.serialNumber || '-'}</span
												>
											</div>
										</Table.Cell>
										<Table.Cell>
											<span class="text-sm text-slate-600">
												{cal.completionDate ? formatDate(cal.completionDate) : '-'}
											</span>
										</Table.Cell>
										<Table.Cell>
											<span class="text-sm font-semibold text-slate-900">
												{cal.expiryDate ? formatDate(cal.expiryDate) : '-'}
											</span>
										</Table.Cell>
										<Table.Cell>
											<span class="text-sm text-slate-600">{cal.vendor || '-'}</span>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="px-3 py-1 {getStatusColor(cal.status)}">
												{cal.status}
											</Badge>
										</Table.Cell>
										<Table.Cell class="pr-6 text-right">
											<div class="flex justify-end gap-1">
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
									<Table.Row>
										<Table.Cell colspan={6} class="h-64 text-center">
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
						<Table.Root>
							<Table.Header class="bg-slate-50/50">
								<Table.Row>
									<Table.Head class="px-6 py-4">Tanggal</Table.Head>
									<Table.Head>Nama Biaya</Table.Head>
									<Table.Head>Peralatan / Maintenance</Table.Head>
									<Table.Head>Jumlah Biaya</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.costs as cost (cost.id)}
									<Table.Row class="group transition-colors hover:bg-slate-50/50">
										<Table.Cell class="px-6 py-4">
											<span class="text-sm text-slate-600">{formatDate(cost.createdAt)}</span>
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-col">
												<span class="font-medium text-slate-900">{cost.name}</span>
												{#if cost.dueDate}
													<span class="text-[10px] text-slate-400">
														Jatuh Tempo: {formatDate(cost.dueDate)}
													</span>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell>
											{#if cost.maintenance}
												<div class="flex flex-col">
													<span class="text-sm text-slate-700">
														{cost.maintenance.equipment?.item?.name || 'Alat'}
													</span>
													<Badge variant="outline" class="w-fit text-[9px] uppercase">
														{cost.maintenance.maintenanceType}
													</Badge>
												</div>
											{:else}
												<span class="text-xs text-slate-400 italic">Umum / Tidak Terkait</span>
											{/if}
										</Table.Cell>
										<Table.Cell>
											<span class="font-bold text-slate-900">{formatCurrency(cost.amount)}</span>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="px-3 py-1 {getStatusColor(cost.status)}">
												{cost.status.replace('_', ' ')}
											</Badge>
										</Table.Cell>
										<Table.Cell class="pr-6 text-right">
											<div class="flex justify-end gap-1">
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
									<Table.Row>
										<Table.Cell colspan={6} class="h-64 text-center">
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
			</Tabs.Root>
		</Card.Content>
	</Card.Root>

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
