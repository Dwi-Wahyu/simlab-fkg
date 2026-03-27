<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import {
		Plus,
		Eye,
		ArrowRightLeft,
		Package,
		Clock,
		CheckCircle2,
		Truck,
		Archive
	} from '@lucide/svelte';
	import { page } from '$app/state';

	let { data } = $props();

	function getStatusVariant(status: string) {
		switch (status) {
			case 'DRAFT':
				return 'secondary';
			case 'APPROVED':
				return 'outline';
			case 'SHIPPED':
				return 'default';
			case 'RECEIVED':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'DRAFT':
				return Clock;
			case 'APPROVED':
				return CheckCircle2;
			case 'SHIPPED':
				return Truck;
			case 'RECEIVED':
				return Archive;
			default:
				return Clock;
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Distribusi Material</h1>
			<p class="text-muted-foreground">Kelola pengiriman alat dan bahan antar kesatuan.</p>
		</div>
		<Button href="/{page.params.org_slug}/distribusi/baru">
			<Plus class="mr-2 size-4" />
			Permintaan Baru
		</Button>
	</div>

	<div class="rounded-xl border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>ID / Tanggal</Table.Head>
					<Table.Head>Dari</Table.Head>
					<Table.Head>Ke</Table.Head>
					<Table.Head>Item</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.distributions as dist}
					<Table.Row>
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-mono text-xs text-muted-foreground">{dist.id.slice(0, 8)}</span>
								<span class="text-sm">{new Date(dist.createdAt).toLocaleDateString('id-ID')}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div
									class="flex size-8 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground"
								>
									{dist.fromOrganization?.name?.charAt(0) || '?'}
								</div>
								<span class="font-medium">{dist.fromOrganization?.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div
									class="flex size-8 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary"
								>
									{dist.toOrganization?.name?.charAt(0) || '?'}
								</div>
								<span class="font-medium">{dist.toOrganization?.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-1 text-muted-foreground">
								<Package class="size-3" />
								<span>{dist.items.length} item</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant={getStatusVariant(dist.status)} class="gap-1 px-2">
								{@const Icon = getStatusIcon(dist.status)}
								<Icon class="size-3" />
								{dist.status}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="ghost"
								size="icon"
								href="/{page.params.org_slug}/distribusi/{dist.id}"
							>
								<Eye class="size-4" />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
							Belum ada data distribusi.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
