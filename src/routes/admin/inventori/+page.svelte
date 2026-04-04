<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import {
		Wrench,
		Package,
		CalendarClock,
		Activity,
		Plus,
		FileUp,
		FileDown,
		Search
	} from '@lucide/svelte';
	import DataTable from './data-table.svelte';
	import { alatColumns, bahanColumns } from './columns.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let { data } = $props();

	// Derived lists
	const alatItems = $derived(data.inventory.filter((item) => item.type === 'ALAT'));
	const bahanItems = $derived(data.inventory.filter((item) => item.type === 'BAHAN'));

	let activeTab = $state('alat');
	let searchAlat = $state('');
	let searchBahan = $state('');
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Inventori</h1>
			<p class="text-muted-foreground">Kelola aset dan bahan habis pakai laboratorium.</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" class="gap-2">
				<FileUp class="size-4" />
				Import
			</Button>
			<Button variant="outline" class="gap-2">
				<FileDown class="size-4" />
				Export
			</Button>
			<Button href="/admin/inventori/tambah" class="gap-2 bg-[#2D5A43] hover:bg-[#234735]">
				<Plus class="size-4" />
				Tambah Item
			</Button>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Alat</Card.Title>
				<Wrench class="size-4 text-blue-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.summary.totalAlat}</div>
				<p class="text-xs text-muted-foreground">Unit alat terdaftar</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Bahan</Card.Title>
				<Package class="size-4 text-green-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.summary.totalBahan}</div>
				<p class="text-xs text-muted-foreground">Item bahan habis pakai</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Mendekati Kadaluarsa</Card.Title>
				<CalendarClock class="size-4 text-orange-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.summary.mendekatiKadaluarsa}</div>
				<p class="text-xs text-muted-foreground">Item perlu restock</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Perlu Kalibrasi</Card.Title>
				<Activity class="size-4 text-red-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.summary.perluKalibrasi}</div>
				<p class="text-xs text-muted-foreground">Alat perlu pemeliharaan</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Inventory Table with Tabs -->
	<Card.Root>
		<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)} class="w-full">
			<Card.Header class="flex flex-row items-center justify-between">
				<div class="space-y-1.5">
					<Card.Title>Daftar Item</Card.Title>
				</div>

				<div class="relative w-72">
					<Search class="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
					{#if activeTab === 'alat'}
						<Input placeholder="Cari alat..." bind:value={searchAlat} class="pl-9" />
					{:else}
						<Input placeholder="Cari bahan..." bind:value={searchBahan} class="pl-9" />
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				<Tabs.List class="my-2 h-8 w-full">
					<Tabs.Trigger class="cursor-pointer" value="alat">
						Alat ({alatItems.length})
					</Tabs.Trigger>
					<Tabs.Trigger class="cursor-pointer" value="bahan">
						Bahan ({bahanItems.length})
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="alat">
					<DataTable data={alatItems} columns={alatColumns} filterValue={searchAlat} />
				</Tabs.Content>
				<Tabs.Content value="bahan">
					<DataTable data={bahanItems} columns={bahanColumns} filterValue={searchBahan} />
				</Tabs.Content>
			</Card.Content>
		</Tabs.Root>
	</Card.Root>
</div>
