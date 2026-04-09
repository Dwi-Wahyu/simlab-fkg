<script lang="ts">
	import { base } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Plus, Search, FileDown, Calendar, User, Microscope, Filter } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';

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

	let activeTab = $state('semua');
	let search = $state('');

	const filteredLendings = $derived(
		data.lendings.filter((l) => {
			const matchesSearch =
				l.requestedByUser?.name.toLowerCase().includes(search.toLowerCase()) ||
				l.laboratorium?.name.toLowerCase().includes(search.toLowerCase());

			if (!matchesSearch) return false;

			if (activeTab === 'dipinjam') return l.status === 'DIPINJAM';
			if (activeTab === 'menunggu') return l.status === 'APPROVED';
			if (activeTab === 'selesai') return l.status === 'RETURNED' || l.status === 'REJECTED';

			return true;
		})
	);

	const getStatusInfo = (status: string | null) => {
		switch (status) {
			case 'APPROVED':
				return { label: 'Disetujui', class: 'bg-blue-100 text-blue-800 border-blue-200' };
			case 'DIPINJAM':
				return { label: 'Sedang Dipinjam', class: 'bg-orange-100 text-orange-800 border-orange-200' };
			case 'RETURNED':
				return { label: 'Dikembalikan', class: 'bg-green-100 text-green-800 border-green-200' };
			case 'REJECTED':
				return { label: 'Ditolak', class: 'bg-red-100 text-red-800 border-red-200' };
			default:
				return { label: status || 'Unknown', class: 'bg-gray-100 text-gray-800 border-gray-200' };
		}
	};
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Daftar Peminjaman</h1>
			<p class="text-muted-foreground">
				Monitor dan kelola peminjaman alat oleh mahasiswa dan dosen.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" class="gap-2">
				<FileDown class="size-4" />
				Export
			</Button>
			<Button href="{base}/admin/peminjaman/baru" class="gap-2 bg-[#2D5A43] hover:bg-[#234735]">
				<Plus class="size-4" />
				Peminjaman Baru
			</Button>
		</div>
	</div>

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
					{data.lendings.filter((l) => l.status === 'DIPINJAM').length}
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
					{data.lendings.filter((l) => l.status === 'APPROVED').length}
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Tabs.Root bind:value={activeTab} class="w-full">
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="space-y-1.5">
						<Card.Title>Daftar Peminjaman</Card.Title>
					</div>

					<div class="relative w-72">
						<Search class="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
						<Input placeholder="Cari peminjam" bind:value={search} class="pl-9" />
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<Tabs.List class="my-2 w-full">
					<Tabs.Trigger class="cursor-pointer" value="semua">Semua</Tabs.Trigger>
					<Tabs.Trigger class="cursor-pointer" value="dipinjam">Dipinjam</Tabs.Trigger>
					<Tabs.Trigger class="cursor-pointer" value="menunggu">Menunggu</Tabs.Trigger>
					<Tabs.Trigger class="cursor-pointer" value="selesai">Selesai</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value={activeTab}>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Peminjam</Table.Head>
								<Table.Head>Laboratorium</Table.Head>
								<Table.Head>Alat</Table.Head>
								<Table.Head>Tanggal Pinjam</Table.Head>
								<Table.Head>Batas Kembali</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Aksi</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredLendings as lending (lending.id)}
								<Table.Row>
									<Table.Cell>
										<div class="font-medium">{lending.requestedByUser?.name || 'Unknown'}</div>
										<div class="text-xs text-muted-foreground uppercase">
											{lending.requestedByUser?.role}
										</div>
									</Table.Cell>
									<Table.Cell>{lending.laboratorium?.name || '-'}</Table.Cell>
									<Table.Cell>
										<div class="flex flex-wrap gap-1">
											{#each lending.items as item (item.id)}
												<Badge variant="outline" class="px-1 py-0 text-[10px]">
													{item.equipment?.item?.name}
												</Badge>
											{/each}
											{#if lending.items.length === 0}
												<span class="text-xs text-muted-foreground">Tidak ada alat</span>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell>
										{formatDate(lending.startDate)}
									</Table.Cell>
									<Table.Cell>
										{lending.endDate ? formatDate(lending.endDate) : '-'}
									</Table.Cell>
									<Table.Cell>
										{@const statusInfo = getStatusInfo(lending.status)}
										<Badge variant="outline" class={statusInfo.class}>
											{statusInfo.label}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="ghost" size="sm" href="{base}/admin/peminjaman/{lending.id}"
											>Detail</Button
										>
									</Table.Cell>
								</Table.Row>
							{/each}
							{#if filteredLendings.length === 0}
								<Table.Row>
									<Table.Cell colspan={7} class="py-10 text-center text-muted-foreground">
										Tidak ada data peminjaman ditemukan.
									</Table.Cell>
								</Table.Row>
							{/if}
						</Table.Body>
					</Table.Root>
				</Tabs.Content>
			</Card.Content>
		</Tabs.Root>
	</Card.Root>
</div>
