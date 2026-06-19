<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Users, Building2, Package, ShieldAlert } from '@lucide/svelte';
	import type { SuperadminDashboardData } from '$lib/types/dashboard';

	let { data }: { data: SuperadminDashboardData } = $props();

	const stats = $derived([
		{ label: 'Total Pengguna', value: data.totalUsers, icon: Users, href: '/admin/users' },
		{
			label: 'Laboratorium',
			value: data.totalLaboratorium,
			icon: Building2,
			href: '/admin/laboratorium'
		},
		{
			label: 'Total Alat',
			value: data.inventorySummary.totalEquipment,
			icon: Package,
			href: '/admin/inventaris/alat'
		},
		{
			label: 'Insiden Aktif',
			value: data.activeIncidents,
			icon: ShieldAlert,
			href: '/admin/limbah-k3'
		}
	]);
</script>

<div class="space-y-6">
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		{#each stats as stat}
			<a href={stat.href}>
				<Card.Root class="transition-colors hover:bg-muted/50">
					<Card.Content>
						<div class="mb-1 flex items-center gap-2 text-muted-foreground">
							<stat.icon class="h-4 w-4" />
							<span class="text-sm">{stat.label}</span>
						</div>
						<p class="text-2xl font-bold">{stat.value}</p>
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<!-- Kondisi Inventaris -->
		<Card.Root>
			<Card.Header class="border-b">
				<Card.Title class="text-base">Kondisi Inventaris</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<div class="flex justify-between text-sm">
					<span class="text-muted-foreground">Baik</span>
					<span class="font-medium text-green-600">{data.inventorySummary.baik}</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-muted-foreground">Rusak Ringan</span>
					<span class="font-medium text-yellow-600">{data.inventorySummary.rusakRingan}</span>
				</div>
				<div class="flex justify-between text-sm">
					<span class="text-muted-foreground">Rusak Berat</span>
					<span class="font-medium text-red-600">{data.inventorySummary.rusakBerat}</span>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Audit Log Terbaru -->
		<Card.Root class="md:col-span-2">
			<Card.Header class="flex flex-row items-center justify-between border-b">
				<Card.Title class="text-base">Aktivitas Terbaru</Card.Title>
				<Button href="/admin/audit-log" variant="link" size="xs">Lihat Semua</Button>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each data.recentAuditLogs as log}
						<div class="flex items-center gap-2 text-sm">
							<Badge
								variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}
								class="shrink-0 text-xs"
							>
								{log.action}
							</Badge>
							<span class="truncate text-muted-foreground">{log.user?.name ?? 'System'}</span>
							<span class="ml-auto shrink-0 text-xs text-muted-foreground">
								{new Date(log.createdAt).toLocaleDateString('id-ID', {
									day: '2-digit',
									month: 'short',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
