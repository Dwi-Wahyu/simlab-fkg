<script lang="ts">
	import { BookOpen, Edit, FlaskConical, Plus, Search, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import * as Table from '$lib/components/ui/table';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	// UI State
	let searchQuery = $state('');
	let isDialogOpen = $state(false);
	let isEditDialogOpen = $state(false);
	let isDeleteDialogOpen = $state(false);
	let selectedSeriesId = $state('');

	// Form State for Create/Edit
	let formName = $state('');
	let formDescription = $state('');
	let formBlockId = $state('');
	let formLabId = $state('');

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	const filteredSeries = $derived(
		data.series.filter(
			(s: any) =>
				s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(s.block?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				(s.laboratorium?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function openCreate() {
		formName = '';
		formDescription = '';
		formBlockId = '';
		formLabId = '';
		isDialogOpen = true;
	}

	function openEdit(series: any) {
		selectedSeriesId = series.id;
		formName = series.name;
		formDescription = series.description || '';
		formBlockId = series.blockId || '';
		formLabId = series.laboratoriumId || '';
		isEditDialogOpen = true;
	}

	function openDelete(id: string) {
		selectedSeriesId = id;
		isDeleteDialogOpen = true;
	}

	const blockTrigger = $derived(
		data.blocks.find((b: any) => b.id === formBlockId)?.name ?? 'Pilih Blok (Opsional)'
	);
	const labTrigger = $derived(
		data.labs.find((l: any) => l.id === formLabId)?.name ?? 'Pilih Laboratorium (Opsional)'
	);
</script>

<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
/>

<ConfirmationDialog
	bind:open={isDeleteDialogOpen}
	title="Hapus Seri Praktikum?"
	description="Tindakan ini tidak dapat dibatalkan. Jadwal yang menggunakan seri ini akan kehilangan referensi serinya."
	onAction={() => {
		const formData = new FormData();
		formData.append('id', selectedSeriesId);
		// Manual form submission for confirmation dialog
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '?/delete';
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'id';
		input.value = selectedSeriesId;
		form.appendChild(input);
		document.body.appendChild(form);

		// Use enhance-like behavior but simpler for this manual trigger
		fetch('?/delete', {
			method: 'POST',
			body: formData
		}).then(async (res) => {
			isDeleteDialogOpen = false;
			notificationType = 'success';
			notificationTitle = 'Berhasil';
			notificationDescription = 'Seri praktikum telah dihapus.';
			showNotification = true;
			await invalidateAll();
		});
	}}
/>

<div class="flex h-full flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Master Praktikum</h1>
			<p class="text-muted-foreground">Kelola grup kegiatan praktikum.</p>
		</div>
		<Button onclick={openCreate}>
			<Plus />
			Tambah Praktikum
		</Button>
	</div>

	<div class="relative w-full max-w-sm">
		<Search class="absolute top-3 left-2.5 h-4 w-4 text-muted-foreground" />
		<Input
			type="search"
			placeholder="Cari nama seri, blok, atau lab..."
			class="pl-9"
			bind:value={searchQuery}
		/>
	</div>

	<div class="rounded-md border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Nama Seri</Table.Head>
					<Table.Head>Blok</Table.Head>
					<Table.Head>Laboratorium</Table.Head>
					<Table.Head>Keterangan</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredSeries as series (series.id)}
					<Table.Row>
						<Table.Cell class="font-bold">{series.name}</Table.Cell>
						<Table.Cell>
							{#if series.block}
								<div class="flex items-center gap-2">
									<BookOpen class="h-4 w-4 text-muted-foreground" />
									{series.block.name}
								</div>
							{:else}
								<span class="text-xs text-muted-foreground italic">-</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if series.laboratorium}
								<div class="flex items-center gap-2">
									<FlaskConical class="h-4 w-4 text-muted-foreground" />
									{series.laboratorium.name}
								</div>
							{:else}
								<span class="text-xs text-muted-foreground italic">-</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="truncate">
							<span class="text-xs text-muted-foreground">
								{series.description || '-'}
							</span>
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button
									variant="outline"
									size="icon"
									class="h-8 w-8"
									onclick={() => openEdit(series)}
								>
									<Edit class="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									class="h-8 w-8 text-destructive"
									onclick={() => openDelete(series.id)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-24 text-center">
							Tidak ada data seri praktikum ditemukan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- Create Dialog -->
<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Tambah Seri Baru</Dialog.Title>
			<Dialog.Description>Buat grup untuk jadwal praktikum.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						isDialogOpen = false;
						notificationType = 'success';
						notificationTitle = 'Berhasil';
						notificationDescription = 'Seri praktikum baru ditambahkan.';
						showNotification = true;
						await update();
					}
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="name">Nama Seri <span class="text-red-500">*</span></Label>
				<Input
					id="name"
					name="name"
					placeholder="Misal: Clinical Skill Lab"
					required
					bind:value={formName}
				/>
			</div>

			<div class="space-y-2">
				<Label for="description">Keterangan</Label>
				<Input
					id="description"
					name="description"
					placeholder="Deskripsi singkat..."
					bind:value={formDescription}
				/>
			</div>

			<div class="space-y-2">
				<Label for="blockId">Blok</Label>
				<SearchableSelect.Root type="single" bind:value={formBlockId}>
					<SearchableSelect.Trigger class="w-full">
						{blockTrigger}
					</SearchableSelect.Trigger>
					<SearchableSelect.Content searchPlaceholder="Cari blok...">
						<SearchableSelect.Item value="" label="Tanpa Blok">Tanpa Blok</SearchableSelect.Item>
						{#each data.blocks as b (b.id)}
							<SearchableSelect.Item value={b.id} label={b.name}>{b.name}</SearchableSelect.Item>
						{/each}
					</SearchableSelect.Content>
				</SearchableSelect.Root>
				<input type="hidden" name="blockId" value={formBlockId} />
			</div>

			<div class="space-y-2">
				<Label for="labId">Laboratorium</Label>
				<SearchableSelect.Root type="single" bind:value={formLabId}>
					<SearchableSelect.Trigger class="w-full">
						{labTrigger}
					</SearchableSelect.Trigger>
					<SearchableSelect.Content searchPlaceholder="Cari laboratorium...">
						<SearchableSelect.Item value="" label="Tanpa Laboratorium"
							>Tanpa Lab</SearchableSelect.Item
						>
						{#each data.labs as l (l.id)}
							<SearchableSelect.Item value={l.id} label={l.name}>{l.name}</SearchableSelect.Item>
						{/each}
					</SearchableSelect.Content>
				</SearchableSelect.Root>
				<input type="hidden" name="labId" value={formLabId} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isDialogOpen = false)}>Batal</Button>
				<Button type="submit">Simpan</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Dialog -->
<Dialog.Root bind:open={isEditDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Seri Praktikum</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						isEditDialogOpen = false;
						notificationType = 'success';
						notificationTitle = 'Berhasil';
						notificationDescription = 'Seri praktikum diperbarui.';
						showNotification = true;
						await update();
					}
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="id" value={selectedSeriesId} />

			<div class="space-y-2">
				<Label for="name-edit">Nama Seri</Label>
				<Input id="name-edit" name="name" required bind:value={formName} />
			</div>

			<div class="space-y-2">
				<Label for="description-edit">Keterangan</Label>
				<Input id="description-edit" name="description" bind:value={formDescription} />
			</div>

			<div class="space-y-2">
				<Label for="blockId-edit">Blok</Label>
				<SearchableSelect.Root type="single" bind:value={formBlockId}>
					<SearchableSelect.Trigger class="w-full">
						{blockTrigger}
					</SearchableSelect.Trigger>
					<SearchableSelect.Content searchPlaceholder="Cari blok...">
						<SearchableSelect.Item value="" label="Tanpa Blok">Tanpa Blok</SearchableSelect.Item>
						{#each data.blocks as b (b.id)}
							<SearchableSelect.Item value={b.id} label={b.name}>{b.name}</SearchableSelect.Item>
						{/each}
					</SearchableSelect.Content>
				</SearchableSelect.Root>
				<input type="hidden" name="blockId" value={formBlockId} />
			</div>

			<div class="space-y-2">
				<Label for="labId-edit">Laboratorium</Label>
				<SearchableSelect.Root type="single" bind:value={formLabId}>
					<SearchableSelect.Trigger class="w-full">
						{labTrigger}
					</SearchableSelect.Trigger>
					<SearchableSelect.Content searchPlaceholder="Cari laboratorium...">
						<SearchableSelect.Item value="" label="Tanpa Laboratorium"
							>Tanpa Lab</SearchableSelect.Item
						>
						{#each data.labs as l (l.id)}
							<SearchableSelect.Item value={l.id} label={l.name}>{l.name}</SearchableSelect.Item>
						{/each}
					</SearchableSelect.Content>
				</SearchableSelect.Root>
				<input type="hidden" name="labId" value={formLabId} />
			</div>

			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isEditDialogOpen = false)}
					>Batal</Button
				>
				<Button type="submit">Simpan Perubahan</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
