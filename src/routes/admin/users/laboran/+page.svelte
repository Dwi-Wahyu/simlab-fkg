<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus, User, Trash2, Pencil } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data, form } = $props();

	let isDeleteDialogOpen = $state(false);
	let userToDelete = $state<{ id: string; name: string } | null>(null);
	let isDeleting = $state(false);

	let isSuccessOpen = $state(false);
	let successMessage = $state('');

	function openDeleteDialog(user: { id: string; name: string }) {
		userToDelete = user;
		isDeleteDialogOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Operasi berhasil';
			isSuccessOpen = true;
		}
	});
</script>

<NotificationDialog
	bind:open={isSuccessOpen}
	title="Berhasil"
	description={successMessage}
	type="success"
/>

{#if userToDelete}
	<ConfirmationDialog
		bind:open={isDeleteDialogOpen}
		title="Hapus Pengguna"
		description="Apakah Anda yakin ingin menghapus {userToDelete.name}? Tindakan ini tidak dapat dibatalkan."
		type="error"
		actionLabel="Hapus"
		loading={isDeleting}
		onAction={() => {
			const formElement = document.getElementById(
				'delete-form-' + userToDelete?.id
			) as HTMLFormElement;
			if (formElement) {
				isDeleting = true;
				formElement.requestSubmit();
			}
		}}
	/>
{/if}

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">Manajemen {data.roleLabel}</h1>
			<p class="text-muted-foreground">
				Kelola data {data.roleLabel.toLowerCase()} dan penugasan laboratorium.
			</p>
		</div>
		{#if !data.error}
			<Button href="/admin/users/laboran/tambah">
				<Plus />
				Tambah {data.roleLabel}
			</Button>
		{/if}
	</div>

	{#if data.error}
		<div class="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
			{data.error}
		</div>
	{:else}
		<div class="rounded-md border bg-white shadow-sm">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Pengguna</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Laboratorium</Table.Head>
						<Table.Head>Dibuat Pada</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.users as u (u.id)}
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="flex items-center gap-2">
									<div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
										<User class="h-5 w-5" />
									</div>
									<div class="flex flex-col">
										<span class="font-semibold">{u.name}</span>
										<span class="text-xs text-muted-foreground">{u.username || '-'}</span>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>{u.email}</Table.Cell>
							<Table.Cell>
								<div class="flex flex-wrap gap-1">
									{#each u.members as member}
										<span
											class="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
										>
											{member.laboratorium?.name || 'Lab tidak diketahui'}
										</span>
									{:else}
										<span class="text-xs text-muted-foreground italic">Belum ada lab</span>
									{/each}
								</div>
							</Table.Cell>
							<Table.Cell
								>{new Date(u.createdAt).toLocaleDateString('id-ID', {
									day: 'numeric',
									month: 'long',
									year: 'numeric'
								})}</Table.Cell
							>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									<Button variant="ghost" size="icon" href="/admin/users/laboran/edit/{u.id}">
										<Pencil class="h-4 w-4" />
									</Button>

									<form
										id="delete-form-{u.id}"
										method="POST"
										action="?/delete"
										use:enhance={() => {
											return async ({ result }) => {
												isDeleting = false;
												isDeleteDialogOpen = false;
												if (result.type === 'success') {
													// Form submission handled by $effect
												}
											};
										}}
									>
										<input type="hidden" name="userId" value={u.id} />
										<Button
											variant="ghost"
											size="icon"
											type="button"
											onclick={() => openDeleteDialog(u)}
											class="text-destructive hover:bg-destructive/10 hover:text-destructive"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</form>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
								Belum ada data {data.roleLabel.toLowerCase()} ditemukan.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
