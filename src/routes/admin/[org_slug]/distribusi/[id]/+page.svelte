<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import {
		ArrowLeft,
		Package,
		User,
		Building2,
		Calendar,
		Clock,
		CheckCircle2,
		Truck,
		Archive,
		Info,
		ShieldCheck,
		Send,
		CheckCircle
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { cn } from '$lib/utils';
	import Label from '@/components/ui/label/label.svelte';

	let { data, form } = $props();

	const dist = $derived(data.distribution);
	const isFromOrg = $derived(dist.fromOrganizationId === data.currentOrgId);
	const isToOrg = $derived(dist.toOrganizationId === data.currentOrgId);

	// Dialog States
	let showConfirm = $state(false);
	let showNotification = $state(false);
	let confirmConfig = $state({
		type: 'info' as 'success' | 'error' | 'info',
		title: '',
		description: '',
		actionLabel: '',
		action: 'validate',
		data: {} as any
	});

	let notificationConfig = $state({
		type: 'success' as 'success' | 'error' | 'info',
		title: '',
		description: ''
	});

	// Form values for shipping/receiving
	let selectedWarehouseId = $state('');

	function handleAction(
		action: string,
		title: string,
		description: string,
		actionLabel: string,
		type: any = 'info'
	) {
		confirmConfig = {
			type,
			title,
			description,
			actionLabel,
			action,
			data: {}
		};
		showConfirm = true;
	}

	$effect(() => {
		if (form?.success) {
			notificationConfig = {
				type: 'success',
				title: 'Berhasil',
				description: form.message
			};
			showNotification = true;
		} else if (form?.success === false) {
			notificationConfig = {
				type: 'error',
				title: 'Gagal',
				description: form.message
			};
			showNotification = true;
		}
	});

	const steps = [
		{ status: 'DRAFT', label: 'Draft', icon: Clock },
		{ status: 'VALIDATED', label: 'Tervalidasi', icon: ShieldCheck },
		{ status: 'APPROVED', label: 'Disetujui', icon: CheckCircle2 },
		{ status: 'SHIPPED', label: 'Dikirim', icon: Truck },
		{ status: 'RECEIVED', label: 'Diterima', icon: Archive }
	];

	const currentStepIndex = $derived(steps.findIndex((s) => s.status === dist.status));

	function getStatusVariant(status: string) {
		switch (status) {
			case 'DRAFT':
				return 'secondary';
			case 'VALIDATED':
				return 'outline';
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
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6 pb-20">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" href="/{page.params.org_slug}/distribusi">
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<div class="mb-1 flex items-center gap-2">
					<h1 class="text-2xl font-bold tracking-tight">Detail Distribusi</h1>
					<Badge variant={getStatusVariant(dist.status)}>{dist.status}</Badge>
				</div>
				<p class="font-mono text-sm text-muted-foreground">{dist.id}</p>
			</div>
		</div>
	</div>

	<!-- Stepper -->
	<div class="grid grid-cols-5 gap-4 rounded-xl border bg-card p-4 shadow-sm">
		{#each steps as step, i}
			<div class="relative flex flex-col items-center gap-2">
				<div
					class={cn(
						'flex size-10 items-center justify-center rounded-full border-2 transition-colors',
						i <= currentStepIndex
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-muted bg-muted text-muted-foreground'
					)}
				>
					<step.icon class="size-5" />
				</div>
				<span
					class={cn(
						'text-xs font-medium',
						i <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
					)}
				>
					{step.label}
				</span>
				{#if i < steps.length - 1}
					<div
						class={cn(
							'absolute top-5 left-[calc(50%+25px)] h-0.5 w-[calc(100%-50px)]',
							i < currentStepIndex ? 'bg-primary' : 'bg-muted'
						)}
					></div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left: Details & Items -->
		<div class="flex flex-col gap-6 lg:col-span-2">
			<Card>
				<CardHeader>
					<CardTitle>Informasi Pengiriman</CardTitle>
				</CardHeader>
				<CardContent class="grid gap-6 sm:grid-cols-2">
					<div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
						<div class="flex items-center gap-2 text-muted-foreground">
							<Building2 class="size-4" />
							<span class="text-xs font-bold tracking-wider uppercase">Dari Kesatuan</span>
						</div>
						<div class="flex items-center gap-3">
							<div
								class="flex size-10 items-center justify-center rounded-lg border bg-background text-lg font-bold"
							>
								{dist.fromOrganization?.name?.charAt(0)}
							</div>
							<div class="flex flex-col">
								<span class="font-bold">{dist.fromOrganization?.name}</span>
								<span class="text-xs text-muted-foreground">Pengirim</span>
							</div>
						</div>
					</div>

					<div class="flex flex-col gap-3 rounded-lg border border-primary/10 bg-primary/5 p-4">
						<div class="flex items-center gap-2 text-primary/70">
							<Building2 class="size-4" />
							<span class="text-xs font-bold tracking-wider uppercase">Ke Kesatuan</span>
						</div>
						<div class="flex items-center gap-3">
							<div
								class="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-lg font-bold text-primary"
							>
								{dist.toOrganization?.name?.charAt(0)}
							</div>
							<div class="flex flex-col">
								<span class="font-bold text-primary">{dist.toOrganization?.name}</span>
								<span class="text-xs text-muted-foreground">Penerima</span>
							</div>
						</div>
					</div>

					<div class="flex items-center gap-3 text-sm">
						<User class="size-4 text-muted-foreground" />
						<span class="text-muted-foreground">Diajukan oleh:</span>
						<span class="font-medium">{dist.requestedByUser?.name}</span>
					</div>
					<div class="flex items-center gap-3 text-sm">
						<Calendar class="size-4 text-muted-foreground" />
						<span class="text-muted-foreground">Tanggal:</span>
						<span class="font-medium"
							>{new Date(dist.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span
						>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Daftar Materi</CardTitle>
					<CardDescription>{dist.items.length} item akan dikirim.</CardDescription>
				</CardHeader>
				<CardContent class="p-0">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="pl-6">Materi</Table.Head>
								<Table.Head>S/N atau Jenis</Table.Head>
								<Table.Head>Kuantitas</Table.Head>
								<Table.Head class="pr-6">Catatan</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each dist.items as item}
								<Table.Row>
									<Table.Cell class="pl-6 font-medium">
										{item.equipment?.item?.name || item.item?.name}
									</Table.Cell>
									<Table.Cell>
										{#if item.equipmentId}
											<Badge variant="outline" class="font-mono"
												>{item.equipment?.serialNumber}</Badge
											>
										{:else}
											<span class="text-sm text-muted-foreground italic">Consumable</span>
										{/if}
									</Table.Cell>
									<Table.Cell>
										<span class="font-bold">{item.quantity}</span>
										<span class="ml-1 text-xs text-muted-foreground">{item.unit || 'UNIT'}</span>
									</Table.Cell>
									<Table.Cell class="pr-6 text-sm text-muted-foreground italic">
										{item.note || '-'}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</CardContent>
			</Card>
		</div>

		<!-- Right: Actions & History -->
		<div class="flex flex-col gap-6">
			<!-- Actions -->
			<Card class="border-primary/20 shadow-lg">
				<CardHeader>
					<CardTitle>Aksi Distribusi</CardTitle>
					<CardDescription>Langkah selanjutnya yang diperlukan.</CardDescription>
				</CardHeader>
				<CardContent class="grid gap-4">
					{#if dist.status === 'DRAFT'}
						<div class="flex flex-col gap-4 rounded-lg border bg-muted p-4">
							<p class="text-sm font-medium">Langkah 1: Validasi BINMAT</p>
							<p class="text-xs text-muted-foreground italic">
								Role Binmat akan memvalidasi kelengkapan data sebelum diajukan ke Komando.
							</p>
							{#if page.data.user?.role === 'operatorBinmatDanBekharrah' || page.data.user?.role === 'superadmin'}
								<Button
									class="w-full"
									onclick={() =>
										handleAction(
											'validate',
											'Validasi Distribusi',
											'Apakah data distribusi sudah lengkap dan siap diajukan untuk approval?',
											'Validasi Data'
										)}
								>
									<ShieldCheck class="mr-2 size-4" />
									Validasi Sekarang
								</Button>
							{:else}
								<Badge variant="outline" class="justify-center py-2">Menunggu Validasi Binmat</Badge
								>
							{/if}
						</div>
					{:else if dist.status === 'VALIDATED'}
						<div class="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
							<p class="text-sm font-medium text-primary">Langkah 2: Approval Komando</p>
							{#if page.data.user?.role === 'pimpinan' || page.data.user?.role === 'superadmin'}
								<div class="grid grid-cols-2 gap-2">
									<Button
										variant="default"
										class="bg-green-600 hover:bg-green-700"
										onclick={() =>
											handleAction(
												'approve',
												'Setujui Distribusi',
												'Anda akan menyetujui distribusi ini untuk segera diproses pengirimannya.',
												'Setujui',
												'success'
											)}
									>
										Setujui
									</Button>
									<Button
										variant="destructive"
										onclick={() =>
											handleAction(
												'reject',
												'Tolak Distribusi',
												'Permintaan akan dikembalikan ke status DRAFT untuk diperbaiki.',
												'Tolak'
											)}
									>
										Tolak
									</Button>
								</div>
							{:else}
								<Badge variant="outline" class="justify-center py-2 text-primary"
									>Menunggu Approval Pimpinan</Badge
								>
							{/if}
						</div>
					{:else if dist.status === 'APPROVED' && isFromOrg}
						<div class="flex flex-col gap-4 rounded-lg border bg-muted p-4">
							<p class="text-sm font-medium">Langkah 3: Persiapan & Pengiriman (Bekharrah)</p>
							<div class="flex flex-col gap-2">
								<Label>Pilih Gudang Asal</Label>
								<Select.Root type="single" bind:value={selectedWarehouseId}>
									<Select.Trigger>
										{data.warehouses.find((w) => w.id === selectedWarehouseId)?.name ||
											'Pilih Gudang'}
									</Select.Trigger>
									<Select.Content>
										{#each data.warehouses as wh}
											<Select.Item value={wh.id}>{wh.name}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<Button
								class="w-full"
								disabled={!selectedWarehouseId}
								onclick={() =>
									handleAction(
										'ship',
										'Kirim Materi',
										'Materi akan ditandai sebagai dalam pengiriman (SHIPPED). Stok akan dikurangi.',
										'Proses Pengiriman',
										'info'
									)}
							>
								<Send class="mr-2 size-4" />
								Kirim Materi
							</Button>
						</div>
					{:else if dist.status === 'SHIPPED' && isToOrg}
						<div class="flex flex-col gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
							<p class="text-sm font-medium text-primary">Langkah 4: Penerimaan (Satuan Tujuan)</p>
							<div class="flex flex-col gap-2">
								<Label>Pilih Gudang Tujuan</Label>
								<Select.Root type="single" bind:value={selectedWarehouseId}>
									<Select.Trigger>
										{data.warehouses.find((w) => w.id === selectedWarehouseId)?.name ||
											'Pilih Gudang'}
									</Select.Trigger>
									<Select.Content>
										{#each data.warehouses as wh}
											<Select.Item value={wh.id}>{wh.name}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<Button
								class="w-full bg-green-600 hover:bg-green-700"
								disabled={!selectedWarehouseId}
								onclick={() =>
									handleAction(
										'receive',
										'Terima Materi',
										'Materi akan dimasukkan ke inventaris satuan Anda.',
										'Konfirmasi Terima',
										'success'
									)}
							>
								<CheckCircle class="mr-2 size-4" />
								Konfirmasi Terima
							</Button>
						</div>
					{:else}
						<div
							class="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center"
						>
							<Info class="size-8 text-muted-foreground opacity-50" />
							<p class="text-sm text-muted-foreground">Tidak ada aksi yang diperlukan saat ini.</p>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Approval Info -->
			{#if data.approval}
				<Card>
					<CardHeader>
						<CardTitle>Riwayat Approval</CardTitle>
					</CardHeader>
					<CardContent class="grid gap-4">
						<div class="flex items-start gap-3">
							<div
								class={cn(
									'mt-2 size-2 rounded-full',
									data.approval.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
								)}
							></div>
							<div class="flex flex-col">
								<span class="text-sm font-bold">{data.approval.status}</span>
								<span class="text-xs text-muted-foreground"
									>Oleh: {data.approval.approvedByUser?.name}</span
								>
								<span class="mt-1 text-xs text-muted-foreground italic"
									>"{data.approval.note || '-'}"</span
								>
								<span class="mt-2 text-[10px] text-muted-foreground"
									>{new Date(data.approval.createdAt).toLocaleString('id-ID')}</span
								>
							</div>
						</div>
					</CardContent>
				</Card>
			{/if}
		</div>
	</div>
</div>

<!-- Form helpers for Dialogs -->
<form id="actionForm" method="POST" use:enhance>
	<input type="hidden" name="id" value={dist.id} />
	{#if confirmConfig.action === 'approve' || confirmConfig.action === 'reject'}
		<input
			type="hidden"
			name="isApproved"
			value={confirmConfig.action === 'approve' ? 'true' : 'false'}
		/>
		<input type="hidden" name="note" value="Disetujui via UI" />
	{:else if confirmConfig.action === 'ship'}
		<input type="hidden" name="fromWarehouseId" value={selectedWarehouseId} />
	{:else if confirmConfig.action === 'receive'}
		<input type="hidden" name="toWarehouseId" value={selectedWarehouseId} />
	{/if}
</form>

<ConfirmationDialog
	bind:open={showConfirm}
	type={confirmConfig.type}
	title={confirmConfig.title}
	description={confirmConfig.description}
	actionLabel={confirmConfig.actionLabel}
	onAction={() => {
		const formEl = document.getElementById('actionForm') as HTMLFormElement;
		if (formEl) {
			formEl.action = `?/${confirmConfig.action === 'reject' ? 'approve' : confirmConfig.action}`;
			formEl.requestSubmit();
		}
		showConfirm = false;
	}}
/>

<NotificationDialog
	bind:open={showNotification}
	type={notificationConfig.type}
	title={notificationConfig.title}
	description={notificationConfig.description}
	onAction={() => (showNotification = false)}
/>
