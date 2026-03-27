<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Plus, Trash2, ArrowLeft, Save, Info } from '@lucide/svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data, form } = $props();

	let toOrganizationId = $state('');
	let items = $state([
		{ type: 'EQUIPMENT', equipmentId: '', itemId: '', quantity: 1, unit: '', note: '' }
	]);

	let showNotification = $state(false);
	let notificationConfig = $state({
		type: 'success' as 'success' | 'error' | 'info',
		title: '',
		description: ''
	});

	$effect(() => {
		if (form?.success === false) {
			notificationConfig = {
				type: 'error',
				title: 'Gagal',
				description: form.message
			};
			showNotification = true;
		}
	});

	function addItem() {
		items = [
			...items,
			{ type: 'EQUIPMENT', equipmentId: '', itemId: '', quantity: 1, unit: '', note: '' }
		];
	}

	function removeItem(index: number) {
		items = items.filter((_, i) => i !== index);
	}

	const selectedToOrg = $derived(data.organizations.find((o) => o.id === toOrganizationId));
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/{page.params.org_slug}/distribusi">
			<ArrowLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Permintaan Distribusi Baru</h1>
			<p class="text-muted-foreground">Buat permintaan pengiriman materi ke kesatuan lain.</p>
		</div>
	</div>

	{#if form?.success === false}
		<div class="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
			{form.message}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={({ formData }) => {
			formData.append('items', JSON.stringify(items));
			formData.append('fromOrganizationId', data.currentOrgId);
		}}
	>
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Informasi Tujuan</CardTitle>
				<CardDescription>Pilih kesatuan tujuan pengiriman materi.</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4">
					<div class="flex flex-col gap-2">
						<Label for="toOrg">Kesatuan Tujuan</Label>
						<Select.Root type="single" bind:value={toOrganizationId} name="toOrganizationId">
							<Select.Trigger class="w-full">
								{selectedToOrg?.name || 'Pilih Kesatuan Tujuan'}
							</Select.Trigger>
							<Select.Content>
								{#each data.organizations as org}
									<Select.Item value={org.id}>{org.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between">
				<div>
					<CardTitle>Daftar Materi</CardTitle>
					<CardDescription>Pilih alat atau bahan yang akan didistribusikan.</CardDescription>
				</div>
				<Button variant="outline" size="sm" onclick={addItem}>
					<Plus class="mr-2 size-4" />
					Tambah Item
				</Button>
			</CardHeader>
			<CardContent>
				<div class="grid gap-6">
					{#each items as item, i}
						<div class="relative grid gap-4 rounded-lg border bg-muted/30 p-4">
							<div class="absolute top-2 right-2">
								<Button
									variant="ghost"
									size="icon-sm"
									class="text-destructive"
									onclick={() => removeItem(i)}
									disabled={items.length === 1}
								>
									<Trash2 class="size-4" />
								</Button>
							</div>

							<div class="grid gap-4 pt-2 sm:grid-cols-2">
								<div class="flex flex-col gap-2">
									<Label>Jenis Item</Label>
									<Select.Root type="single" bind:value={item.type}>
										<Select.Trigger>
											{item.type === 'EQUIPMENT' ? 'Alat (Asset)' : 'Bahan (Consumable)'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="EQUIPMENT">Alat (Asset)</Select.Item>
											<Select.Item value="CONSUMABLE">Bahan (Consumable)</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>

								{#if item.type === 'EQUIPMENT'}
									<div class="flex flex-col gap-2">
										<Label>Pilih Alat</Label>
										<Select.Root type="single" bind:value={item.equipmentId}>
											<Select.Trigger>
												{data.availableEquipment.find((e) => e.id === item.equipmentId)
													?.serialNumber || 'Pilih Serial Number'}
											</Select.Trigger>
											<Select.Content>
												{#each data.availableEquipment as eqp}
													<Select.Item value={eqp.id}>
														<div class="flex flex-col">
															<span class="font-bold">{eqp.serialNumber}</span>
															<span class="text-xs text-muted-foreground"
																>{eqp.item.name} - {eqp.brand}</span
															>
														</div>
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
								{:else}
									<div class="flex flex-col gap-2">
										<Label>Pilih Bahan</Label>
										<Select.Root type="single" bind:value={item.itemId}>
											<Select.Trigger>
												{data.consumableItems.find((it) => it.id === item.itemId)?.name ||
													'Pilih Bahan'}
											</Select.Trigger>
											<Select.Content>
												{#each data.consumableItems as consumable}
													<Select.Item value={consumable.id}>
														<div class="flex w-full items-center justify-between gap-4">
															<span>{consumable.name}</span>
															<Badge variant="outline" class="h-4 text-[10px]"
																>Stok: {consumable.totalStock}</Badge
															>
														</div>
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
										{#if item.itemId}
											{@const selected = data.consumableItems.find((it) => it.id === item.itemId)}
											<p class="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
												<Info class="size-3" />
												Total stok tersedia:
												<span class="font-bold text-primary">{selected?.totalStock}</span>
												{selected?.baseUnit}
											</p>
										{/if}
									</div>
								{/if}
							</div>

							<div class="grid gap-4 sm:grid-cols-3">
								<div class="flex flex-col gap-2">
									<Label>Kuantitas</Label>
									<Input
										type="number"
										bind:value={item.quantity}
										min="1"
										disabled={item.type === 'EQUIPMENT'}
									/>
								</div>
								<div class="flex flex-col gap-2">
									<Label>Satuan</Label>
									<Input
										bind:value={item.unit}
										placeholder="misal: PCS, BOX"
										disabled={item.type === 'EQUIPMENT'}
									/>
								</div>
								<div class="flex flex-col gap-2">
									<Label>Catatan</Label>
									<Input bind:value={item.note} placeholder="Keterangan kondisi/lainnya" />
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-8 flex justify-end">
					<Button type="submit" class="min-w-[150px]">
						<Save class="mr-2 size-4" />
						Buat Permintaan
					</Button>
				</div>
			</CardContent>
		</Card>
	</form>
</div>

<NotificationDialog
	bind:open={showNotification}
	type={notificationConfig.type}
	title={notificationConfig.title}
	description={notificationConfig.description}
	onAction={() => (showNotification = false)}
/>
