<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Plus, Trash2, Edit, Save, X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let editingId = $state<string | null>(null);
	let editName = $state('');

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	// Confirmation State
	let showConfirmDelete = $state(false);
	let idToDelete = $state<string | null>(null);
	let isDeleting = $state(false);

	function startEdit(dept: any) {
		editingId = dept.id;
		editName = dept.name;
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
	}

	function confirmDelete(id: string) {
		idToDelete = id;
		showConfirmDelete = true;
	}
</script>

<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	onAction={() => (showNotification = false)}
/>

<ConfirmationDialog
	bind:open={showConfirmDelete}
	type="error"
	title="Hapus Departemen?"
	description="Tindakan ini akan menghapus semua blok di bawah departemen ini."
	loading={isDeleting}
	onAction={async () => {
		if (!idToDelete) return;
		isDeleting = true;
		const formData = new FormData();
		formData.append('id', idToDelete);
		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: formData
			});
			if (response.ok) {
				showConfirmDelete = false;
				await invalidateAll();
			} else {
				notificationType = 'error';
				notificationTitle = 'Gagal!';
				notificationDescription = 'Terjadi kesalahan saat menghapus.';
				showNotification = true;
			}
		} catch (e) {
			notificationType = 'error';
			notificationTitle = 'Gagal!';
			notificationDescription = 'Terjadi kesalahan jaringan.';
			showNotification = true;
		} finally {
			isDeleting = false;
			idToDelete = null;
		}
	}}
/>

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Master Departemen</h1>
			<p class="text-muted-foreground">Kelola daftar departemen di fakultas.</p>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<Card.Root>
			<Card.Header>
				<Card.Title>Tambah Departemen</Card.Title>
				<Card.Description>Buat entitas departemen baru.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								notificationType = 'success';
								notificationTitle = 'Berhasil!';
								notificationDescription = 'Departemen telah berhasil ditambahkan.';
								showNotification = true;
								await invalidateAll();
							}
						};
					}}
					class="space-y-4"
				>
					<div class="space-y-2">
						<Label for="name">Nama Departemen</Label>
						<Input id="name" name="name" placeholder="Misal: Konservasi Gigi" required />
					</div>
					<Button type="submit" class="w-full">
						<Plus />
						Tambah
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Daftar Departemen</Card.Title>
				<Card.Description>Total {data.departments.length} departemen.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Nama Departemen</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.departments as dept (dept.id)}
							<Table.Row>
								<Table.Cell>
									{#if editingId === dept.id}
										<Input bind:value={editName} class="max-w-[300px]" />
									{:else}
										{dept.name}
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										{#if editingId === dept.id}
											<form
												method="POST"
												action="?/update"
												use:enhance={() => {
													return async ({ result }) => {
														if (result.type === 'success') {
															editingId = null;
															await invalidateAll();
														}
													};
												}}
											>
												<input type="hidden" name="id" value={dept.id} />
												<input type="hidden" name="name" value={editName} />
												<Button type="submit" variant="ghost" size="icon">
													<Save class="h-4 w-4 text-primary" />
												</Button>
											</form>
											<Button variant="ghost" size="icon" onclick={cancelEdit}>
												<X class="h-4 w-4 text-muted-foreground" />
											</Button>
										{:else}
											<Button variant="ghost" size="icon" onclick={() => startEdit(dept)}>
												<Edit class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="text-destructive hover:bg-destructive/10 hover:text-destructive"
												onclick={() => confirmDelete(dept.id)}
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										{/if}
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={2} class="h-24 text-center">
									Belum ada data departemen.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>
