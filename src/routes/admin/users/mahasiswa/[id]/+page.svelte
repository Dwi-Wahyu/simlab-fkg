<script lang="ts">
	import {
		ChevronLeft,
		FileSpreadsheet,
		FileText,
		User,
		Mail,
		GraduationCap,
		Calendar,
		ClipboardList,
		Layers,
		Award,
		Clock
	} from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as XLSX from 'xlsx';

	let { data } = $props();

	const studentClassesDisplay = $derived(
		data.student.practicumClasses
			?.map((pc: any) => `${pc.class?.name ?? '-'} (${pc.class?.batch ?? '-'})`)
			.join(', ') || '-'
	);

	function exportToExcel() {
		const wb = XLSX.utils.book_new();

		const rows: (string | number)[][] = [
			['FAKULTAS KEDOKTERAN GIGI'],
			['UNIVERSITAS HASANUDDIN'],
			['LAPORAN PENILAIAN PRAKTIKUM MAHASISWA'],
			[''],
			['Nama Mahasiswa', data.student.name],
			['NIM', data.student.username],
			['Email', data.student.email || '-'],
			['Kelas / Angkatan', studentClassesDisplay],
			['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
			['']
		];

		if (data.groupedAssessments.length === 0) {
			rows.push(['Belum ada data penilaian praktikum.']);
		} else {
			data.groupedAssessments.forEach((group: any) => {
				rows.push([`SERI PRAKTIKUM: ${group.seriesName.toUpperCase()}`]);
				rows.push(['No', 'Jadwal / Aktivitas', 'Modul Praktikum', 'Nilai', 'DPJP / Penilai', 'Tanggal']);

				group.assessments.forEach((a: any, index: number) => {
					rows.push([
						index + 1,
						a.schedule?.title || '-',
						a.module?.name || '-',
						a.score ?? 0,
						a.instructor?.name || '-',
						a.createdAt ? new Date(a.createdAt).toLocaleDateString('id-ID') : '-'
					]);
				});
				rows.push(['']);
			});
		}

		const ws = XLSX.utils.aoa_to_sheet(rows);

		// Merges for headers
		ws['!merges'] = [
			{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
			{ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
			{ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
		];

		// Column widths
		ws['!cols'] = [
			{ wch: 6 },
			{ wch: 30 },
			{ wch: 30 },
			{ wch: 10 },
			{ wch: 25 },
			{ wch: 15 }
		];

		XLSX.utils.book_append_sheet(wb, ws, 'Penilaian Praktikum');

		const safeFilename = `Penilaian_${data.student.username}_${data.student.name.replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
		XLSX.writeFile(wb, safeFilename);
	}

	function exportToPdf() {
		window.print();
	}

	function getStatusBadgeVariant(status: string) {
		switch (status) {
			case 'APPROVED':
			case 'DIPINJAM':
				return 'default';
			case 'RETURNED':
				return 'secondary';
			case 'REJECTED':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<!-- Printable Header (Visible only during window.print()) -->
<div class="print-header hidden">
	<div class="header-container">
		<img src="/logo.png" alt="Logo UNHAS" class="header-logo" />
		<div class="header-text">
			<h1 class="font-serif text-xl font-bold uppercase tracking-wide">Fakultas Kedokteran Gigi</h1>
			<h2 class="text-base font-semibold uppercase tracking-wider text-slate-700">Universitas Hasanuddin</h2>
			<p class="mt-1 text-xs text-slate-500">Sistem Informasi Manajemen Laboratorium (SIM-Lab)</p>
		</div>
	</div>
	<hr class="my-3 border-t-2 border-slate-900" />
	
	<div class="mb-4 grid grid-cols-2 gap-2 text-xs">
		<div><strong>Nama Mahasiswa:</strong> {data.student.name}</div>
		<div><strong>NIM:</strong> {data.student.username}</div>
		<div><strong>Email:</strong> {data.student.email || '-'}</div>
		<div><strong>Kelas / Angkatan:</strong> {studentClassesDisplay}</div>
		<div><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID')}</div>
	</div>

	<h3 class="mb-2 text-sm font-bold uppercase text-slate-900">Rekapitulasi Penilaian Praktikum</h3>
	{#if data.groupedAssessments.length === 0}
		<p class="text-xs italic text-slate-500">Belum ada data penilaian praktikum.</p>
	{:else}
		{#each data.groupedAssessments as group (group.seriesId)}
			<div class="mb-4">
				<h4 class="mb-1 text-xs font-bold text-slate-800 uppercase">Seri: {group.seriesName}</h4>
				<table class="w-full border-collapse border border-slate-300 text-xs">
					<thead>
						<tr class="bg-slate-100">
							<th class="border border-slate-300 p-1.5 text-center w-8">No</th>
							<th class="border border-slate-300 p-1.5 text-left">Jadwal / Aktivitas</th>
							<th class="border border-slate-300 p-1.5 text-left">Modul</th>
							<th class="border border-slate-300 p-1.5 text-center w-16">Nilai</th>
							<th class="border border-slate-300 p-1.5 text-left">DPJP / Penilai</th>
							<th class="border border-slate-300 p-1.5 text-center w-24">Tanggal</th>
						</tr>
					</thead>
					<tbody>
						{#each group.assessments as a, i (a.id)}
							<tr>
								<td class="border border-slate-300 p-1.5 text-center">{i + 1}</td>
								<td class="border border-slate-300 p-1.5">{a.schedule?.title || '-'}</td>
								<td class="border border-slate-300 p-1.5">{a.module?.name || '-'}</td>
								<td class="border border-slate-300 p-1.5 text-center font-bold">{a.score}</td>
								<td class="border border-slate-300 p-1.5">{a.instructor?.name || '-'}</td>
								<td class="border border-slate-300 p-1.5 text-center">
									{a.createdAt ? new Date(a.createdAt).toLocaleDateString('id-ID') : '-'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	{/if}
</div>

<!-- Main UI (Hidden during print) -->
<div class="print-hide flex flex-col gap-6 p-4 md:p-8">
	<!-- Back Navigation -->
	<div>
		<a
			href="/admin/users/mahasiswa"
			class="mb-2 flex w-fit items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
		>
			<ChevronLeft class="h-4 w-4" />
			Kembali ke Daftar Mahasiswa
		</a>
		<h1 class="text-2xl font-bold tracking-tight text-slate-900">Detail Mahasiswa</h1>
		<p class="text-slate-500">Informasi profil, penilaian praktikum, dan riwayat peminjaman.</p>
	</div>

	<!-- Student Profile Summary Card -->
	<Card.Root class="overflow-hidden border-slate-200 shadow-sm">
		<Card.Header class="bg-slate-50/50 pb-4">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-4">
					<div
						class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2D5A43] text-white shadow-md"
					>
						<User class="h-7 w-7" />
					</div>
					<div>
						<h2 class="text-xl font-bold text-slate-900">{data.student.name}</h2>
						<p class="font-mono text-sm text-slate-500">NIM: {data.student.username}</p>
					</div>
				</div>
				<Badge variant="outline" class="w-fit border-[#2D5A43] text-[#2D5A43]">Mahasiswa</Badge>
			</div>
		</Card.Header>
		<Card.Content class="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 md:grid-cols-3">
			<div class="flex items-center gap-3 rounded-lg border p-3 bg-white">
				<Mail class="h-5 w-5 text-slate-400" />
				<div>
					<p class="text-xs font-medium text-slate-400">Email</p>
					<p class="text-sm font-semibold text-slate-700">{data.student.email || '-'}</p>
				</div>
			</div>
			<div class="flex items-center gap-3 rounded-lg border p-3 bg-white">
				<GraduationCap class="h-5 w-5 text-slate-400" />
				<div>
					<p class="text-xs font-medium text-slate-400">Kelas / Angkatan</p>
					<p class="text-sm font-semibold text-slate-700">{studentClassesDisplay}</p>
				</div>
			</div>
			<div class="flex items-center gap-3 rounded-lg border p-3 bg-white sm:col-span-2 md:col-span-1">
				<Calendar class="h-5 w-5 text-slate-400" />
				<div>
					<p class="text-xs font-medium text-slate-400">Terdaftar Sejak</p>
					<p class="text-sm font-semibold text-slate-700">
						{new Date(data.student.createdAt).toLocaleDateString('id-ID', {
							day: 'numeric',
							month: 'long',
							year: 'numeric'
						})}
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Assessments Card (Grouped by Seri Praktikum) -->
	<Card.Root class="shadow-sm">
		<Card.Header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
			<div class="space-y-1">
				<div class="flex items-center gap-2">
					<Award class="h-5 w-5 text-[#2D5A43]" />
					<Card.Title class="text-lg">Detail Penilaian Praktikum</Card.Title>
				</div>
				<Card.Description>
					Rekapitulasi seluruh hasil penilaian praktikum mahasiswa berdasarkan seri praktikum.
				</Card.Description>
			</div>
			<!-- Export Action Buttons -->
			<div class="flex flex-wrap items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={exportToPdf}
					class="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
				>
					<FileText class="h-4 w-4 text-red-600" />
					Ekspor PDF
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={exportToExcel}
					class="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
				>
					<FileSpreadsheet class="h-4 w-4 text-emerald-600" />
					Ekspor Excel
				</Button>
			</div>
		</Card.Header>
		<Card.Content class="p-4 md:p-6">
			{#if data.groupedAssessments.length === 0}
				<div class="py-12 text-center text-slate-500">
					<Award class="mx-auto h-10 w-10 text-slate-300 mb-2" />
					<p class="text-base font-medium">Belum Ada Penilaian</p>
					<p class="text-sm text-slate-400">Mahasiswa ini belum memiliki data penilaian praktikum.</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each data.groupedAssessments as group (group.seriesId)}
						<div class="rounded-lg border bg-white overflow-hidden shadow-xs">
							<!-- Series Header -->
							<div class="flex items-center gap-2 border-b bg-slate-50 px-4 py-3">
								<Layers class="h-4 w-4 text-[#2D5A43]" />
								<h3 class="font-bold text-slate-800 text-sm md:text-base">{group.seriesName}</h3>
								<Badge variant="secondary" class="ml-auto text-xs">
									{group.assessments.length} Modul Dinilai
								</Badge>
							</div>

							<!-- Series Assessment Table -->
							<div class="overflow-x-auto">
								<Table.Root>
									<Table.Header>
										<Table.Row class="bg-slate-50/50">
											<Table.Head class="w-12 text-center">No</Table.Head>
											<Table.Head>Jadwal / Aktivitas</Table.Head>
											<Table.Head>Modul Praktikum</Table.Head>
											<Table.Head class="text-center">Nilai</Table.Head>
											<Table.Head>DPJP / Penilai</Table.Head>
											<Table.Head class="text-right">Tanggal</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each group.assessments as a, i (a.id)}
											<Table.Row class="hover:bg-slate-50/50 transition-colors">
												<Table.Cell class="text-center font-medium text-slate-500">
													{i + 1}
												</Table.Cell>
												<Table.Cell class="font-medium text-slate-900">
													{a.schedule?.title || '-'}
												</Table.Cell>
												<Table.Cell class="text-slate-600">
													{a.module?.name || '-'}
												</Table.Cell>
												<Table.Cell class="text-center">
													<Badge
														variant="outline"
														class="font-bold text-sm px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200"
													>
														{a.score}
													</Badge>
												</Table.Cell>
												<Table.Cell class="text-slate-700">
													{a.instructor?.name || '-'}
												</Table.Cell>
												<Table.Cell class="text-right text-xs text-slate-500">
													{a.createdAt
														? new Date(a.createdAt).toLocaleDateString('id-ID', {
																day: 'numeric',
																month: 'short',
																year: 'numeric'
															})
														: '-'}
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Lending History Card -->
	<Card.Root class="shadow-sm">
		<Card.Header class="border-b pb-4">
			<div class="flex items-center gap-2">
				<ClipboardList class="h-5 w-5 text-[#2D5A43]" />
				<Card.Title class="text-lg">Riwayat Peminjaman</Card.Title>
			</div>
			<Card.Description>
				Daftar riwayat peminjaman alat dan bahan laboratorium oleh mahasiswa.
			</Card.Description>
		</Card.Header>
		<Card.Content class="p-0 md:p-6">
			{#if data.lendings.length === 0}
				<div class="py-12 text-center text-slate-500">
					<ClipboardList class="mx-auto h-10 w-10 text-slate-300 mb-2" />
					<p class="text-base font-medium">Belum Ada Peminjaman</p>
					<p class="text-sm text-slate-400">Mahasiswa ini belum memiliki riwayat peminjaman.</p>
				</div>
			{:else}
				<div class="overflow-x-auto rounded-md border bg-white">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-slate-50/50">
								<Table.Head class="px-6 py-4">Laboratorium</Table.Head>
								<Table.Head>Keperluan</Table.Head>
								<Table.Head>Detail Barang</Table.Head>
								<Table.Head>Periode Pinjam</Table.Head>
								<Table.Head class="pr-6 text-right">Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.lendings as l (l.id)}
								<Table.Row class="hover:bg-slate-50/50 transition-colors">
									<Table.Cell class="px-6 py-4 font-semibold text-slate-900">
										{l.laboratorium?.name || '-'}
									</Table.Cell>
									<Table.Cell class="text-slate-600">
										<Badge variant="outline" class="font-normal">
											{l.purpose.replace(/_/g, ' ')}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-slate-600">
										<ul class="list-disc list-inside space-y-0.5 text-xs">
											{#each l.items as item}
												<li>
													{item.equipment?.item?.name || item.requestedItem?.name || 'Barang'} ({item.qty} pcs)
												</li>
											{:else}
												<li class="italic text-slate-400">Item tidak dirinci</li>
											{/each}
										</ul>
									</Table.Cell>
									<Table.Cell class="text-xs text-slate-600">
										<div class="flex items-center gap-1">
											<Clock class="h-3.5 w-3.5 text-slate-400" />
											{new Date(l.startDate).toLocaleDateString('id-ID')}
											{#if l.endDate}
												- {new Date(l.endDate).toLocaleDateString('id-ID')}
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell class="pr-6 text-right">
										<Badge variant={getStatusBadgeVariant(l.status ?? '')}>
											{l.status}
										</Badge>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<style>
	@media print {
		:global(body) {
			background-color: white !important;
			color: black !important;
		}
		:global(aside),
		:global(header),
		:global(nav) {
			display: none !important;
		}
		.print-hide {
			display: none !important;
		}
		.print-header {
			display: block !important;
		}
		.header-container {
			display: flex;
			align-items: center;
			gap: 1rem;
		}
		.header-logo {
			height: 60px;
			width: auto;
			object-fit: contain;
		}
		.header-text {
			display: flex;
			flex-direction: column;
		}
	}
</style>
