<script lang="ts">
	import {
		AlertTriangle,
		Calendar,
		ChevronDown,
		ChevronUp,
		Clock,
		FileDown,
		Info,
		Microscope,
		Plus,
		Search,
		User
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { cn } from '$lib/utils.js';

	let { data } = $props();

	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	// --- ADMIN STATE & LOGIC ---
	let activeTab = $state('semua');
	let search = $state('');
	let expandedLendingsAdmin = $state<Record<string, boolean>>({});

	const filteredLendings = $derived(
		data.lendings?.filter((l: any) => {
			const matchesSearch =
				(l.requestedByUser?.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
				(l.laboratorium?.name?.toLowerCase().includes(search.toLowerCase()) ?? false);

			if (!matchesSearch) return false;

			if (activeTab === 'dipinjam') return l.status === 'DIPINJAM';
			if (activeTab === 'menunggu') return l.status === 'APPROVED';
			if (activeTab === 'selesai') return l.status === 'RETURNED' || l.status === 'REJECTED';

			return true;
		}) ?? []
	);

	const getStatusInfo = (status: string | null) => {
		switch (status) {
			case 'APPROVED':
				return {
					label: 'Disetujui',
					class: 'bg-blue-100 text-blue-800 border-blue-200'
				};
			case 'DIPINJAM':
				return {
					label: 'Sedang Dipinjam',
					class: 'bg-orange-100 text-orange-800 border-orange-200'
				};
			case 'RETURNED':
				return {
					label: 'Dikembalikan',
					class: 'bg-green-100 text-green-800 border-green-200'
				};
			case 'REJECTED':
				return {
					label: 'Ditolak',
					class: 'bg-red-100 text-red-800 border-red-200'
				};
			default:
				return {
					label: status || 'Unknown',
					class: 'bg-gray-100 text-gray-800 border-gray-200'
				};
		}
	};

	// --- MAHASISWA LAZY LOAD STATE & LOGIC ---
	let studentLendings = $state<any[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let expandedLendingsStudent = $state<Record<string, boolean>>({});
	let studentSearch = $state('');
	let studentActiveTab = $state('semua');

	// Fetch data on mount if student
	$effect(() => {
		if (data.user.role === 'peneliti') {
			fetchStudentLendings();
		} else {
			isLoading = false;
		}
	});

	async function fetchStudentLendings() {
		try {
			isLoading = true;
			error = null;
			const res = await fetch('/api/admin/peminjaman');
			if (!res.ok) throw new Error('Gagal memuat data peminjaman');
			const json = await res.json();
			studentLendings = json.lendings || [];
		} catch (err: any) {
			error = err.message || 'Terjadi kesalahan saat memuat data';
		} finally {
			isLoading = false;
		}
	}

	const studentFilteredLendings = $derived(
		studentLendings.filter((l) => {
			const matchesSearch =
				(l.laboratorium?.name?.toLowerCase().includes(studentSearch.toLowerCase()) ?? false) ||
				(l.purpose?.toLowerCase().includes(studentSearch.toLowerCase()) ?? false);

			if (!matchesSearch) return false;

			if (studentActiveTab === 'dipinjam') return l.status === 'DIPINJAM';
			if (studentActiveTab === 'menunggu') return l.status === 'APPROVED' || l.status === 'DRAFT';
			if (studentActiveTab === 'selesai') return l.status === 'RETURNED' || l.status === 'REJECTED';

			return true;
		})
	);

	const getStudentStatusInfo = (status: string | null) => {
		switch (status) {
			case 'DRAFT':
				return {
					label: 'Menunggu',
					class: 'bg-yellow-100 text-yellow-800 border-yellow-200'
				};
			case 'APPROVED':
				return {
					label: 'Disetujui',
					class: 'bg-blue-100 text-blue-800 border-blue-200'
				};
			case 'DIPINJAM':
				return {
					label: 'Sedang Dipinjam',
					class: 'bg-orange-100 text-orange-800 border-orange-200'
				};
			case 'RETURNED':
				return {
					label: 'Selesai',
					class: 'bg-green-100 text-green-800 border-green-200'
				};
			case 'REJECTED':
				return {
					label: 'Ditolak',
					class: 'bg-red-100 text-red-800 border-red-200'
				};
			default:
				return {
					label: status || 'Unknown',
					class: 'bg-gray-100 text-gray-800 border-gray-200'
				};
		}
	};
</script>

{#if data.user.role === 'peneliti' || data.user.role === 'instruktur'}
	<div class="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
		<!-- Header -->
		<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-slate-900">Peminjaman Saya</h1>
				<p class="text-slate-500">Ajukan dan pantau status peminjaman alat laboratorium Anda.</p>
			</div>
		</div>

		<!-- Summary Cards -->
		<div class="grid gap-4 md:grid-cols-3">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Pengajuan</Card.Title>
					<Calendar class="size-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					{#if isLoading}
						<div class="h-8 w-16 animate-pulse rounded bg-slate-200"></div>
					{:else}
						<div class="text-2xl font-bold">{studentLendings.length}</div>
					{/if}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Sedang Dipinjam</Card.Title>
					<Microscope class="size-4 text-orange-600" />
				</Card.Header>
				<Card.Content>
					{#if isLoading}
						<div class="h-8 w-16 animate-pulse rounded bg-slate-200"></div>
					{:else}
						<div class="text-2xl font-bold">
							{studentLendings.filter((l) => l.status === 'DIPINJAM').length}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Menunggu / Disetujui</Card.Title>
					<Clock class="size-4 text-blue-600" />
				</Card.Header>
				<Card.Content>
					{#if isLoading}
						<div class="h-8 w-16 animate-pulse rounded bg-slate-200"></div>
					{:else}
						<div class="text-2xl font-bold">
							{studentLendings.filter((l) => l.status === 'APPROVED' || l.status === 'DRAFT')
								.length}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Main Table Card -->
		<Card.Root mobileAware={true}>
			<Card.Header>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="space-y-1.5">
						<Card.Title>Riwayat Peminjaman</Card.Title>
					</div>

					<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
						<div class="relative w-full sm:w-64">
							<Search class="absolute top-3 left-2.5 size-4 text-muted-foreground" />
							<Input
								placeholder="Cari lab atau tujuan..."
								bind:value={studentSearch}
								class="w-full pl-9"
							/>
						</div>
						<div class="w-full sm:w-48">
							<Select.Root type="single" bind:value={studentActiveTab}>
								<Select.Trigger class="w-full">
									<Select.Value placeholder="Pilih Status" /> Semua Status
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="semua" label="Semua Status">Semua Status</Select.Item>
									<Select.Item value="dipinjam" label="Sedang Dipinjam">Sedang Dipinjam</Select.Item
									>
									<Select.Item value="menunggu" label="Menunggu / Disetujui"
										>Menunggu / Disetujui</Select.Item
									>
									<Select.Item value="selesai" label="Selesai">Selesai / Ditolak</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				{#if error}
					<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-800">
						{error}
					</div>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root class="block md:table">
							<Table.Header class="hidden md:table-header-group">
								<Table.Row class="md:table-row">
									<Table.Head class="px-6 py-4">Laboratorium</Table.Head>
									<Table.Head>Tujuan</Table.Head>
									<Table.Head>Tanggal Pinjam</Table.Head>
									<Table.Head>Batas Kembali</Table.Head>
									<Table.Head class="hidden text-center md:table-cell">Status</Table.Head>
									<Table.Head class="pr-6 text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body class="block md:table-row-group">
								{#if isLoading}
									{#each Array(3) as _}
										<Table.Row class="flex animate-pulse flex-col border-b md:table-row">
											<Table.Cell class="p-4 md:px-6 md:py-4">
												<div class="h-4 w-48 rounded bg-slate-200"></div>
											</Table.Cell>
											<Table.Cell class="p-4 md:px-6 md:py-4">
												<div class="h-4 w-32 rounded bg-slate-200"></div>
											</Table.Cell>
											<Table.Cell class="p-4 md:px-6 md:py-4">
												<div class="h-4 w-24 rounded bg-slate-200"></div>
											</Table.Cell>
											<Table.Cell class="p-4 md:px-6 md:py-4">
												<div class="h-4 w-24 rounded bg-slate-200"></div>
											</Table.Cell>
											<Table.Cell class="p-4 text-center md:px-6 md:py-4">
												<div class="mx-auto h-6 w-16 rounded-full bg-slate-200"></div>
											</Table.Cell>
											<Table.Cell class="p-4 text-right md:px-6 md:py-4">
												<div class="ml-auto h-8 w-12 rounded bg-slate-200"></div>
											</Table.Cell>
										</Table.Row>
									{/each}
								{:else}
									{#each studentFilteredLendings as lending (lending.id)}
										{@const statusInfo = getStudentStatusInfo(lending.status)}
										<Table.Row
											class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
										>
											<!-- Column 1: Laboratorium + mobile status badge + expand chevron -->
											<Table.Cell
												class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
											>
												<div class="flex flex-col">
													<div class="flex items-center gap-2">
														<span class="font-bold text-slate-900 md:font-medium"
															>{lending.laboratorium?.name || 'Unknown Lab'}</span
														>
														<Badge
															variant="outline"
															class={cn('px-1.5 py-0.5 text-[9px] md:hidden', statusInfo.class)}
														>
															{statusInfo.label}
														</Badge>
													</div>
													<div class="mt-0.5 text-xs text-muted-foreground uppercase">
														ID: {lending.id.slice(0, 8)}
													</div>
												</div>
												<Button
													variant="ghost"
													size="icon"
													class="ml-4 h-8 w-8 shrink-0 md:hidden"
													onclick={() =>
														(expandedLendingsStudent[lending.id] =
															!expandedLendingsStudent[lending.id])}
													aria-label="Expand row"
												>
													{#if expandedLendingsStudent[lending.id]}
														<ChevronUp class="h-4 w-4" />
													{:else}
														<ChevronDown class="h-4 w-4" />
													{/if}
												</Button>
											</Table.Cell>

											<!-- Column 2: Tujuan -->
											<Table.Cell
												class={cn(
													expandedLendingsStudent[lending.id] ? 'flex' : 'hidden',
													'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
												)}
											>
												<span class="text-xs font-semibold text-slate-400 md:hidden">Tujuan</span>
												<span class="text-sm text-slate-600">{lending.purpose}</span>
											</Table.Cell>

											<!-- Column 3: Tanggal Pinjam -->
											<Table.Cell
												class={cn(
													expandedLendingsStudent[lending.id] ? 'flex' : 'hidden',
													'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
												)}
											>
												<span class="text-xs font-semibold text-slate-400 md:hidden"
													>Tanggal Pinjam</span
												>
												<span class="text-sm text-slate-600">{formatDate(lending.startDate)}</span>
											</Table.Cell>

											<!-- Column 4: Batas Kembali -->
											<Table.Cell
												class={cn(
													expandedLendingsStudent[lending.id] ? 'flex' : 'hidden',
													'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
												)}
											>
												<span class="text-xs font-semibold text-slate-400 md:hidden"
													>Batas Kembali</span
												>
												<span class="text-sm text-slate-600"
													>{lending.endDate ? formatDate(lending.endDate) : '-'}</span
												>
											</Table.Cell>

											<!-- Column 5: Status (desktop only) -->
											<Table.Cell
												class="hidden text-center md:table-cell md:border-b md:px-6 md:py-4"
											>
												<Badge variant="outline" class={cn('mx-auto', statusInfo.class)}>
													{statusInfo.label}
												</Badge>
											</Table.Cell>

											<!-- Column 6: Aksi -->
											<Table.Cell
												class={cn(
													expandedLendingsStudent[lending.id] ? 'flex' : 'hidden',
													'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2 md:text-right'
												)}
											>
												<Button
													variant="outline"
													size="sm"
													onclick={() =>
														(expandedLendingsStudent[lending.id] =
															!expandedLendingsStudent[lending.id])}
													class="w-full gap-1 sm:w-fit"
												>
													{#if expandedLendingsStudent[lending.id]}
														<ChevronUp class="size-4" /> Tutup
													{:else}
														<ChevronDown class="size-4" /> Detail
													{/if}
												</Button>
											</Table.Cell>
										</Table.Row>

										<!-- Collapsible details row for Student (both desktop & mobile) -->
										{#if expandedLendingsStudent[lending.id]}
											<Table.Row class="bg-slate-50/30">
												<Table.Cell colspan={6} class="border-b p-4 md:p-6">
													<div
														class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300"
													>
														<div class="grid gap-6 md:grid-cols-2">
															<!-- Left column: Metadata -->
															<div class="space-y-4">
																<h4
																	class="flex items-center gap-2 text-sm font-bold text-slate-800"
																>
																	<Info class="size-4 text-emerald-600" />
																	Detail Informasi
																</h4>
																<div class="grid grid-cols-2 gap-y-3 text-sm">
																	<span class="font-medium text-slate-500">Tujuan Peminjaman</span>
																	<span class="font-semibold text-slate-900">{lending.purpose}</span
																	>

																	<span class="font-medium text-slate-500">Unit / Kelas</span>
																	<span class="text-slate-900">{lending.unit}</span>

																	<span class="font-medium text-slate-500">Tanggal Pinjam</span>
																	<span class="flex items-center gap-1.5 text-slate-900">
																		<Calendar class="size-3.5 text-slate-400" />
																		{formatDate(lending.startDate)}
																	</span>

																	<span class="font-medium text-slate-500">Batas Pengembalian</span>
																	<span class="flex items-center gap-1.5 text-slate-900">
																		<Calendar class="size-3.5 text-slate-400" />
																		{lending.endDate ? formatDate(lending.endDate) : '-'}
																	</span>
																</div>

																{#if lending.status === 'REJECTED' && lending.rejectedReason}
																	<div class="rounded-lg border border-red-100 bg-red-50 p-4">
																		<div class="flex gap-2">
																			<AlertTriangle class="size-5 shrink-0 text-red-600" />
																			<div>
																				<h5 class="text-xs font-bold text-red-800">
																					Alasan Penolakan
																				</h5>
																				<p class="mt-1 text-xs text-red-700 italic">
																					"{lending.rejectedReason}"
																				</p>
																			</div>
																		</div>
																	</div>
																{/if}
															</div>

															<!-- Right column: Items -->
															<div class="space-y-4">
																<h4
																	class="flex items-center gap-2 text-sm font-bold text-slate-800"
																>
																	<Microscope class="size-4 text-emerald-600" />
																	Alat yang Dipinjam
																</h4>
																<div class="overflow-hidden rounded-lg border border-slate-200">
																	<table class="w-full text-left text-xs">
																		<thead
																			class="bg-slate-50 font-bold tracking-wider text-slate-600 uppercase"
																		>
																			<tr>
																				<th class="px-4 py-2">Nama Alat</th>
																				<th class="px-4 py-2 text-center">Jumlah</th>
																				<th class="px-4 py-2 text-right">Status</th>
																			</tr>
																		</thead>
																		<tbody
																			class="divide-y divide-slate-100 bg-white text-slate-700"
																		>
																			{#each lending.items as item (item.id)}
																				<tr>
																					<td class="px-4 py-2.5 font-medium"
																						>{item.equipment?.item?.name || 'Alat'}</td
																					>
																					<td
																						class="px-4 py-2.5 text-center font-bold text-slate-900"
																						>{item.qty} pcs</td
																					>
																					<td class="px-4 py-2.5 text-right">
																						{#if item.returnStatus}
																							<span
																								class={cn(
																									'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
																									item.returnStatus === 'BAIK'
																										? 'border-emerald-100 bg-emerald-50 text-emerald-700'
																										: 'border-red-100 bg-red-50 text-red-700'
																								)}
																							>
																								{item.returnStatus}
																							</span>
																						{:else}
																							<span class="text-slate-400 italic">Dipinjam</span>
																						{/if}
																					</td>
																				</tr>
																			{:else}
																				<tr>
																					<td
																						colspan={3}
																						class="px-4 py-3 text-center text-slate-400"
																					>
																						Tidak ada rincian alat
																					</td>
																				</tr>
																			{/each}
																		</tbody>
																	</table>
																</div>
															</div>
														</div>
													</div>
												</Table.Cell>
											</Table.Row>
										{/if}
									{:else}
										<Table.Row class="flex flex-col md:table-row">
											<Table.Cell
												colspan={6}
												class="py-10 text-center text-muted-foreground md:table-cell"
											>
												Tidak ada data peminjaman ditemukan.
											</Table.Cell>
										</Table.Row>
									{/each}
								{/if}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="mx-auto max-w-7xl space-y-8 p-4 sm:p-6">
		<!-- Header -->
		<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-slate-900">Daftar Peminjaman</h1>
				<p class="text-slate-500">Monitor dan kelola peminjaman alat oleh mahasiswa dan dosen.</p>
			</div>
			<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
				<Button variant="outline" class="w-full gap-2 sm:w-fit">
					<FileDown class="size-4" />
					Export
				</Button>
				<Button href="/admin/peminjaman/baru" class="w-full gap-2  sm:w-fit">
					<Plus class="size-4" />
					Peminjaman Baru
				</Button>
			</div>
		</div>

		<!-- Summary Cards -->
		<div class="grid gap-4 md:grid-cols-3">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Peminjaman</Card.Title>
					<Calendar class="size-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.lendings.length}</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Sedang Dipinjam</Card.Title>
					<Microscope class="size-4 text-orange-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{data.lendings.filter((l: any) => l.status === 'DIPINJAM').length}
					</div>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Menunggu Pengembalian</Card.Title>
					<User class="size-4 text-blue-600" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{data.lendings.filter((l: any) => l.status === 'APPROVED').length}
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
			<div class="relative w-full sm:w-64">
				<Search class="absolute top-3 left-2.5 size-4 text-muted-foreground" />
				<Input placeholder="Cari peminjam..." bind:value={search} class="w-full pl-9" />
			</div>
			<div class="w-full sm:w-48">
				<Select.Root type="single" bind:value={activeTab}>
					<Select.Trigger class="w-full">
						<Select.Value placeholder="Pilih Status" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="semua" label="Semua Status">Semua Status</Select.Item>
						<Select.Item value="dipinjam" label="Sedang Dipinjam">Sedang Dipinjam</Select.Item>
						<Select.Item value="menunggu" label="Menunggu">Menunggu</Select.Item>
						<Select.Item value="selesai" label="Selesai">Selesai</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Main Table Card -->

		<div class="rounded-md border bg-white shadow-sm">
			<Table.Root class="block md:table">
				<Table.Header class="hidden md:table-header-group">
					<Table.Row class="md:table-row">
						<Table.Head class="px-6 py-4">Peminjam</Table.Head>
						<Table.Head>Laboratorium</Table.Head>
						<Table.Head>Alat</Table.Head>
						<Table.Head>Tanggal Pinjam</Table.Head>
						<Table.Head>Batas Kembali</Table.Head>
						<Table.Head class="hidden md:table-cell">Status</Table.Head>
						<Table.Head class="pr-6 text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body class="block md:table-row-group">
					{#each filteredLendings as lending (lending.id)}
						{@const statusInfo = getStatusInfo(lending.status)}
						<Table.Row
							class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50 md:table-row md:border-b"
						>
							<!-- Column 1: Peminjam + mobile status badge + expand chevron -->
							<Table.Cell
								class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:px-6 md:py-4"
							>
								<div class="flex flex-col">
									<div class="flex items-center gap-2">
										<span class="font-bold text-slate-900 md:font-medium"
											>{lending.requestedByUser?.name || 'Unknown'}</span
										>
										<Badge
											variant="outline"
											class={cn('px-1.5 py-0.5 text-[9px] md:hidden', statusInfo.class)}
										>
											{statusInfo.label}
										</Badge>
									</div>
									<div class="mt-0.5 text-xs text-muted-foreground uppercase">
										{lending.requestedByUser?.role}
									</div>
								</div>
								<Button
									variant="ghost"
									size="icon"
									class="ml-4 h-8 w-8 shrink-0 md:hidden"
									onclick={() =>
										(expandedLendingsAdmin[lending.id] = !expandedLendingsAdmin[lending.id])}
									aria-label="Expand row"
								>
									{#if expandedLendingsAdmin[lending.id]}
										<ChevronUp class="h-4 w-4" />
									{:else}
										<ChevronDown class="h-4 w-4" />
									{/if}
								</Button>
							</Table.Cell>

							<!-- Column 2: Laboratorium -->
							<Table.Cell
								class={cn(
									expandedLendingsAdmin[lending.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Laboratorium</span>
								<span class="text-sm text-slate-600">{lending.laboratorium?.name || '-'}</span>
							</Table.Cell>

							<!-- Column 3: Alat -->
							<Table.Cell
								class={cn(
									expandedLendingsAdmin[lending.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Alat</span>
								<div class="flex flex-wrap gap-1">
									{#each lending.items as item (item.id)}
										<Badge variant="outline" class="px-1 py-0 text-[10px]">
											{item.equipment?.item?.name}
										</Badge>
									{:else}
										<span class="text-xs text-muted-foreground">Tidak ada alat</span>
									{/each}
								</div>
							</Table.Cell>

							<!-- Column 4: Tanggal Pinjam -->
							<Table.Cell
								class={cn(
									expandedLendingsAdmin[lending.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Tanggal Pinjam</span>
								<span class="text-sm text-slate-600">{formatDate(lending.startDate)}</span>
							</Table.Cell>

							<!-- Column 5: Batas Kembali -->
							<Table.Cell
								class={cn(
									expandedLendingsAdmin[lending.id] ? 'flex' : 'hidden',
									'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2'
								)}
							>
								<span class="text-xs font-semibold text-slate-400 md:hidden">Batas Kembali</span>
								<span class="text-sm text-slate-600"
									>{lending.endDate ? formatDate(lending.endDate) : '-'}</span
								>
							</Table.Cell>

							<!-- Column 6: Status (desktop only) -->
							<Table.Cell class="hidden md:table-cell md:border-b md:px-6 md:py-4">
								<Badge variant="outline" class={statusInfo.class}>
									{statusInfo.label}
								</Badge>
							</Table.Cell>

							<!-- Column 7: Aksi -->
							<Table.Cell
								class={cn(
									expandedLendingsAdmin[lending.id] ? 'flex' : 'hidden',
									'justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:py-4 md:pl-2 md:text-right'
								)}
							>
								<Button
									variant="ghost"
									size="sm"
									href="/admin/peminjaman/{lending.id}"
									class="w-full text-[#2D5A43] hover:bg-slate-100 hover:text-[#234735] sm:w-fit"
								>
									Detail
								</Button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row class="flex flex-col md:table-row">
							<Table.Cell colspan={7} class="py-10 text-center text-muted-foreground md:table-cell">
								Tidak ada data peminjaman ditemukan.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{/if}
