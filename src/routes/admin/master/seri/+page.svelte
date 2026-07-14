<script lang="ts">
	import { Edit, Plus, Search, Trash2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
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

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	const filteredSeries = $derived(
		data.series.filter((s: any) =>
			s.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function openCreate() {
		formName = '';
		formDescription = '';
		isDialogOpen = true;
	}

	function openEdit(series: any) {
		selectedSeriesId = series.id;
		formName = series.name;
		formDescription = series.description || '';
		isEditDialogOpen = true;
	}

	function openDelete(id: string) {
		selectedSeriesId = id;
		isDeleteDialogOpen = true;
	}
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
	description="Tindakan ini tidak dapat dibatalkan. Seri praktikum tidak dapat dihapus jika masih digunakan oleh jadwal praktikum atau riwayat logbook."
	onAction={() => {
		const formData = new FormData();
		formData.append('id', selectedSeriesId);

		fetch('?/delete', {
			method: 'POST',
			body: formData
		}).then(async (res) => {
			const result = await res.json();
			isDeleteDialogOpen = false;
			
			let isSuccess = true;
			let errMsg = 'Terjadi kesalahan saat menghapus.';
			
			if (result && typeof result === 'object') {
				if (result.type === 'failure' || result.type === 'error') {
					isSuccess = false;
					const dataObj = result.data ? JSON.parse(result.data) : null;
					errMsg = dataObj?.message || 'Gagal menghapus seri.';
				}
			}

			if (isSuccess) {
				notificationType = 'success';
				notificationTitle = 'Berhasil';
				notificationDescription = 'Seri praktikum telah dihapus.';
				await invalidateAll();
			} else {
				notificationType = 'error';
				notificationTitle = 'Gagal';
				notificationDescription = errMsg;
			}
			showNotification = true;
		}).catch((err) => {
			isDeleteDialogOpen = false;
			notificationType = 'error';
			notificationTitle = 'Gagal';
			notificationDescription = 'Koneksi bermasalah.';
			showNotification = true;
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
			placeholder="Cari nama seri..."
			class="pl-9"
			bind:value={searchQuery}
		/>
	</div>

	<div class="rounded-md border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Nama Seri</Table.Head>
					<Table.Head>Keterangan</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredSeries as series (series.id)}
					<Table.Row>
						<Table.Cell class="font-bold">{series.name}</Table.Cell>
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
						<Table.Cell colspan={3} class="h-24 text-center">
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
			<Dialog.Description>Buat grup untuk jadwal praktikum generik.</Dialog.Description>
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
				<p class="text-[10px] text-muted-foreground italic">
					Bisa dipakai untuk jadwal di blok dan laboratorium mana pun.
				</p>
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

			<Dialog.Footer>
				<Button type="button" variant="ghost" onclick={() => (isEditDialogOpen = false)}>Batal</Button>
				<Button type="submit">Simpan Perubahan</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
