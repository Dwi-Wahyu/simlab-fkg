<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Users, Package, Calendar } from '@lucide/svelte';

	let { data } = $props();

	const lab = $derived(data.lab);
	const stats = $derived(data.stats);

	function formatDate(date: Date | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium'
		}).format(new Date(date));
	}
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/admin/laboratorium">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{lab.name}</h1>
			<p class="text-muted-foreground">Detail dan anggota laboratorium.</p>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Anggota</Card.Title>
				<Users class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{lab.members.length}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Peralatan</Card.Title>
				<Package class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{stats.equipmentCount}</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Dibuat Pada</Card.Title>
				<Calendar class="size-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-lg font-bold">{formatDate(lab.createdAt)}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Informasi Umum</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-3 gap-2 border-b pb-2">
					<span class="font-semibold">Nama:</span>
					<span class="col-span-2">{lab.name}</span>
				</div>
				<div class="grid grid-cols-3 gap-2 border-b pb-2">
					<span class="font-semibold">Slug:</span>
					<span class="col-span-2">{lab.slug || '-'}</span>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<span class="font-semibold">ID:</span>
					<span class="col-span-2 text-xs font-mono">{lab.id}</span>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Daftar Anggota</Card.Title>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Nama</Table.Head>
							<Table.Head>Role</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each lab.members as member}
							<Table.Row>
								<Table.Cell>{member.user?.name}</Table.Cell>
								<Table.Cell>
									<Badge variant={member.role === 'koordinator' ? 'default' : 'secondary'}>
										{member.role.toUpperCase()}
									</Badge>
								</Table.Cell>
							</Table.Row>
						{/each}
						{#if lab.members.length === 0}
							<Table.Row>
								<Table.Cell colspan={2} class="text-center">Belum ada anggota.</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>
