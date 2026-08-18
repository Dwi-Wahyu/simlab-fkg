<script lang="ts">
	import {
		AlertTriangle,
		Calendar,
		Clock,
		Edit,
		FileText,
		Info,
		Microscope,
		Plus,
		Search
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Accordion from '$lib/components/ui/accordion';
	import { cn } from '$lib/utils.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	import {
		formatLendingPurpose,
		formatLendingStatus,
		getLendingStatusInfo,
		STATUS_OPTIONS
	} from '$lib/utils/peminjaman';

	let { data }: { data: any } = $props();

	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	};

	let activeTab = $state($page.url.searchParams.get('status') || 'semua');
	let search = $state($page.url.searchParams.get('q') || '');

	$effect(() => {
		const url = new URL(window.location.href);
		let changed = false;
		if (activeTab && activeTab !== 'semua') {
			if (url.searchParams.get('status') !== activeTab) {
				url.searchParams.set('status', activeTab);
				changed = true;
			}
		} else if (url.searchParams.has('status')) {
			url.searchParams.delete('status');
			changed = true;
		}

		if (search) {
			if (url.searchParams.get('q') !== search) {
				url.searchParams.set('q', search);
				changed = true;
			}
		} else if (url.searchParams.has('q')) {
			url.searchParams.delete('q');
			changed = true;
		}

		if (changed) {
			goto(url, { replaceState: true, keepFocus: true, noScroll: true });
		}
	});

	const selectedStatusLabel = $derived(
		STATUS_OPTIONS.find((c) => c.value === activeTab)?.label ?? 'Semua Status'
	);

	function filterStudentLendings(lendings: any[]) {
		return (
			lendings.filter((l: any) => {
				const matchesSearch =
					(l.laboratorium?.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
					(l.purpose?.toLowerCase().includes(search.toLowerCase()) ?? false);

				if (!matchesSearch) return false;

				if (activeTab === 'dipinjam') return l.status === 'DIPINJAM';
				if (activeTab === 'menunggu') return l.status === 'APPROVED' || l.status === 'DRAFT';
				if (activeTab === 'selesai') return l.status === 'RETURNED' || l.status === 'REJECTED';

				return true;
			}) ?? []
		);
	}
</script>

<div class="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
	<!-- Header -->
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Peminjaman Saya</h1>
			<p class="text-slate-500">Ajukan dan pantau status peminjaman alat laboratorium Anda.</p>
		</div>
		<Button
			href="/admin/peminjaman/ajukan"
			class="w-full gap-2 bg-[#006a34] text-white hover:bg-[#268549] sm:w-fit"
		>
			<Plus class="size-4" />
			Ajukan Peminjaman
		</Button>
	</div>

	{#await data.lendingsPromise}
		<!-- Summary Cards Loading Skeleton -->
		<div class="grid gap-4 md:grid-cols-3">
			{#each Array(3) as _}
				<Card.Root>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<div class="h-4 w-24 animate-pulse rounded bg-slate-200"></div>
						<div class="h-4 w-4 animate-pulse rounded bg-slate-200"></div>
					</Card.Header>
					<Card.Content>
						<div class="h-8 w-16 animate-pulse rounded bg-slate-200"></div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Main Table Loading Skeleton -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="h-6 w-36 animate-pulse rounded bg-slate-200"></div>
			<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
				<div class="h-9 w-full animate-pulse rounded bg-slate-200 sm:w-64"></div>
				<div class="h-9 w-full animate-pulse rounded bg-slate-200 sm:w-48"></div>
			</div>
		</div>
		<div class="space-y-4">
			{#each Array(4) as _}
				<div class="h-12 w-full animate-pulse rounded bg-slate-100"></div>
			{/each}
		</div>
	{:then lendings}
		{@const filteredList = filterStudentLendings(lendings)}

		<!-- Summary Cards -->
		<div class="grid gap-4 md:grid-cols-3">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Pengajuan</Card.Title>
					<Calendar class="size-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{lendings.length}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Sedang Dipinjam</Card.Title>
					<Microscope class="size-4 text-orange-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{lendings.filter((l: any) => l.status === 'DIPINJAM').length}
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Menunggu / Disetujui</Card.Title>
					<Clock class="size-4 text-blue-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{lendings.filter((l: any) => l.status === 'APPROVED' || l.status === 'DRAFT').length}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div>
			<div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="space-y-1.5">
					<h3 class="leading-none font-semibold tracking-tight">Riwayat Peminjaman</h3>
				</div>

				<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
					<div class="w-full sm:w-48">
						<Select.Root type="single" bind:value={activeTab}>
							<Select.Trigger class="w-full">
								{selectedStatusLabel}
							</Select.Trigger>
							<Select.Content>
								{#each STATUS_OPTIONS as option}
									<Select.Item value={option.value} label={option.label}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</div>

			<!-- Main Table -->
			<div class="overflow-hidden">
				<!-- Desktop View: Table -->
				<div class="hidden rounded-md border bg-white shadow-sm md:block">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="px-6 py-4">Unit</Table.Head>
								<Table.Head>Tujuan</Table.Head>
								<Table.Head>Tanggal Pinjam</Table.Head>
								<Table.Head class="text-center">Status</Table.Head>
								<Table.Head class="pr-6 text-right">Aksi</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredList as lending (lending.id)}
								{@const statusInfo = getLendingStatusInfo(lending.status)}
								<Table.Row class="group border-b transition-colors hover:bg-slate-50/50">
									<Table.Cell class="p-4 pl-6 whitespace-normal">{lending.unit}</Table.Cell>
									<Table.Cell class="py-4">
										<span class="font-medium text-slate-900"
											>{formatLendingPurpose(lending.purpose)}</span
										>
									</Table.Cell>
									<Table.Cell class="py-4">
										<span class="text-sm text-slate-600">{formatDate(lending.startDate)}</span>
										-
										<span class="text-sm text-slate-600"
											>{lending.endDate ? formatDate(lending.endDate) : '-'}</span
										>
									</Table.Cell>
									<Table.Cell class="py-4 text-center">
										<Badge variant="outline" class={cn('mx-auto', statusInfo.class)}>
											{statusInfo.label}
										</Badge>
									</Table.Cell>
									<Table.Cell class="p-4 pr-6 text-right">
										<div class="flex items-center justify-end gap-2">
											{#if lending.status === 'DRAFT'}
												<Button
													variant="outline"
													size="sm"
													href="/admin/peminjaman/{lending.id}/edit-mandiri"
													class="gap-1 border-[#006a34] text-[#006a34] hover:bg-[#006a34]/10"
												>
													<Edit class="size-4" /> Edit
												</Button>
											{/if}
											<Button variant="outline" size="sm" href="/admin/peminjaman/{lending.id}">
												Detail
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={5} class="py-10 text-center text-muted-foreground">
										Tidak ada data peminjaman ditemukan.
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>

				<!-- Mobile View: Accordion -->
				<div class="block md:hidden">
					{#if filteredList.length === 0}
						<div class="py-10 text-center text-muted-foreground">
							Tidak ada data peminjaman ditemukan.
						</div>
					{:else}
						<Accordion.Root type="multiple" class="w-full">
							{#each filteredList as lending (lending.id)}
								{@const statusInfo = getLendingStatusInfo(lending.status)}
								<Accordion.Item
									value={lending.id}
									class="mb-2 rounded-md border bg-white px-0 shadow-sm"
								>
									<Accordion.Trigger
										class="px-4 py-3 transition-colors hover:bg-slate-50/50 hover:no-underline"
									>
										<div class="flex w-full flex-col items-start gap-1.5 text-left">
											<div class="flex w-full items-center justify-between gap-2">
												<span class="font-bold text-slate-900"
													>{formatLendingPurpose(lending.purpose)}</span
												>
												<Badge
													variant="outline"
													class={cn('shrink-0 px-1.5 py-0.5 text-[10px]', statusInfo.class)}
												>
													{statusInfo.label}
												</Badge>
											</div>
											<div class="flex flex-col gap-0.5 text-xs text-slate-500">
												<span class="font-medium text-slate-700">{lending.unit}</span>
												<span
													>{formatDate(lending.startDate)} - {lending.endDate
														? formatDate(lending.endDate)
														: '...'}</span
												>
											</div>
										</div>
									</Accordion.Trigger>
									<Accordion.Content class="px-4 pb-4">
										<div class="space-y-4 pt-2">
											<div class="space-y-3 text-sm">
												<div class="flex flex-col">
													<span
														class="text-xs font-semibold tracking-wider text-slate-400 uppercase"
														>Nomor Surat</span
													>
													<span class="mt-0.5 text-slate-900">{lending.nomorSurat || '-'}</span>
												</div>
												<div class="flex flex-col">
													<span
														class="text-xs font-semibold tracking-wider text-slate-400 uppercase"
														>Surat Pengajuan</span
													>
													{#if lending.surat}
														<a
															href="/uploads/letter/{lending.surat}"
															target="_blank"
															class="mt-0.5 flex w-fit items-center gap-1 font-semibold text-[#006a34] hover:underline"
														>
															<FileText class="size-3.5" />
															Lihat Surat
														</a>
													{:else}
														<span class="mt-0.5 text-slate-400">-</span>
													{/if}
												</div>
											</div>

											{#if lending.status === 'REJECTED' && lending.rejectedReason}
												<div class="rounded-lg border border-red-100 bg-red-50 p-3">
													<div class="flex gap-2">
														<AlertTriangle class="size-4 shrink-0 text-red-600" />
														<div>
															<h5 class="text-xs font-bold text-red-800">Alasan Penolakan</h5>
															<p class="mt-0.5 text-xs text-red-700 italic">
																"{lending.rejectedReason}"
															</p>
														</div>
													</div>
												</div>
											{/if}

											<div class="space-y-2">
												<h4 class="flex items-center gap-2 text-xs font-bold text-slate-800">
													<Microscope class="size-3.5 text-emerald-600" />
													Alat yang Dipinjam
												</h4>
												<div class="overflow-hidden rounded-md border border-slate-200">
													<table class="w-full text-left text-xs">
														<thead
															class="bg-slate-50 font-bold tracking-wider text-slate-600 uppercase"
														>
															<tr>
																<th class="px-2 py-2">Alat</th>
																<th class="px-2 py-2 text-center">Jml</th>
															</tr>
														</thead>
														<tbody class="divide-y divide-slate-100 bg-white text-slate-700">
															{#each lending.items as item (item.id)}
																<tr>
																	<td class="px-2 py-2 font-medium"
																		>{item.equipment?.item?.name ||
																			item.requestedItem?.name ||
																			'Alat tidak diketahui'}</td
																	>
																	<td class="px-2 py-2 text-center font-bold text-slate-900"
																		>{item.qty}</td
																	>
																</tr>
															{:else}
																<tr>
																	<td colspan={2} class="px-2 py-2 text-center text-slate-400"
																		>Tidak ada rincian alat</td
																	>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											</div>

											<div class="flex flex-col gap-2 pt-2">
												{#if lending.status === 'DRAFT'}
													<Button
														variant="outline"
														size="sm"
														href="/admin/peminjaman/{lending.id}/edit-mandiri"
														class="w-full gap-1 border-[#006a34] text-[#006a34] hover:bg-[#006a34]/10"
													>
														<Edit class="size-4" /> Edit Peminjaman
													</Button>
												{/if}
												<Button
													variant="outline"
													size="sm"
													href="/admin/peminjaman/{lending.id}"
													class="w-full text-[#2D5A43] hover:bg-slate-100 hover:text-[#234735]"
												>
													Detail Peminjaman
												</Button>
											</div>
										</div>
									</Accordion.Content>
								</Accordion.Item>
							{/each}
						</Accordion.Root>
					{/if}
				</div>
			</div>
		</div>
	{:catch err}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
			<p class="font-medium">Gagal memuat data peminjaman.</p>
			<p class="mt-1 text-xs text-red-600">{err?.message || 'Terjadi kesalahan pada server.'}</p>
		</div>
	{/await}
</div>
