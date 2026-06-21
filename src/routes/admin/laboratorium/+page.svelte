<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Plus, Pencil, Trash2, Eye } from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let isCreateModalOpen = $state(false);
	let isUpdateModalOpen = $state(false);
	let isDeleteConfirmOpen = $state(false);
	let isNotificationOpen = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationMessage = $state('');

	let selectedLab = $state<{
		id: string;
		name: string;
		slug: string | null;
		members: any[];
	} | null>(null);

	let deleteTargetId = $state('');

	// State for forms
	let name = $state('');
	let coordinatorId = $state('');

	$effect(() => {
		if (form?.success) {
			notificationType = 'success';
			notificationTitle = 'Berhasil';
			notificationMessage = form.message;
			isNotificationOpen = true;
			isCreateModalOpen = false;
			isUpdateModalOpen = false;
			isDeleteConfirmOpen = false;
		} else if (form?.message) {
			notificationType = 'error';
			notificationTitle = 'Gagal';
			notificationMessage = form.message;
			isNotificationOpen = true;
		}
	});

	function openUpdateModal(lab: any) {
		selectedLab = lab;
		name = lab.name;
		coordinatorId = lab.members.find((m: any) => m.role === 'koordinator')?.userId || '';
		isUpdateModalOpen = true;
	}

	function openDeleteConfirm(id: string) {
		deleteTargetId = id;
		isDeleteConfirmOpen = true;
	}

	const selectedCoordinatorLabel = $derived(
		data.coordinators.find((c: any) => c.id === coordinatorId)?.name || 'Pilih Koordinator'
	);
</script>

<div class="space-y-6 p-6">
	<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Manajemen Laboratorium</h1>
			<p class="text-muted-foreground">Kelola daftar laboratorium dan koordinatornya.</p>
		</div>
		<Button
			onclick={() => {
				name = '';
				coordinatorId = '';
				isCreateModalOpen = true;
			}}
			class="w-full md:w-fit"
		>
			<Plus />
			Tambah Lab
		</Button>
	</div>

	<div class="rounded-md border bg-white">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Nama Lab</Table.Head>
					<Table.Head>Slug</Table.Head>
					<Table.Head>Koordinator</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.labs as lab}
					<Table.Row>
						<Table.Cell class="font-medium">{lab.name}</Table.Cell>
						<Table.Cell>{lab.slug}</Table.Cell>
						<Table.Cell>
							{lab.members.find((m: any) => m.role === 'koordinator')?.user?.name || '-'}
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<a
									href="/admin/laboratorium/{lab.id}"
									class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
								>
									<Eye class="size-4" />
								</a>
								<Button variant="outline" size="icon" onclick={() => openUpdateModal(lab)}>
									<Pencil class="size-4" />
								</Button>
								<Button variant="destructive" size="icon" onclick={() => openDeleteConfirm(lab.id)}>
									<Trash2 class="size-4" />
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
				{#if data.labs.length === 0}
					<Table.Row>
						<Table.Cell colspan={4} class="h-24 text-center">
							Belum ada data laboratorium.
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- Modal Tambah -->
<Dialog.Root bind:open={isCreateModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Tambah Laboratorium</Dialog.Title>
			<Dialog.Description>Masukkan data laboratorium baru di sini.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/create" use:enhance class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="name">Nama Laboratorium</Label>
				<Input
					id="name"
					name="name"
					bind:value={name}
					placeholder="Contoh: Lab Radiologi"
					required
				/>
			</div>
			<div class="grid gap-2">
				<Label>Koordinator</Label>

				<Select.Root type="single">
					<Select.Trigger class="w-[180px]"></Select.Trigger>
					<Select.Content>
						<Select.Item value="light">Light</Select.Item>
						<Select.Item value="dark">Dark</Select.Item>
						<Select.Item value="system">System</Select.Item>
					</Select.Content>
				</Select.Root>

				<Select.Root type="single" bind:value={coordinatorId}>
					<Select.Trigger class="w-full">
						<Select.Trigger>Pilih Koordinator</Select.Trigger>
					</Select.Trigger>
					<Select.Content>
						{#each data.coordinators as coord}
							<Select.Item value={coord.id} label={coord.name}>{coord.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="coordinatorId" value={coordinatorId} />
			</div>
			<Dialog.Footer>
				<Button type="submit">Simpan</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Modal Update -->
<Dialog.Root bind:open={isUpdateModalOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Edit Laboratorium</Dialog.Title>
			<Dialog.Description>Perbarui data laboratorium.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/update" use:enhance class="grid gap-4 py-4">
			<input type="hidden" name="id" value={selectedLab?.id} />
			<div class="grid gap-2">
				<Label for="edit-name">Nama Laboratorium</Label>
				<Input id="edit-name" name="name" bind:value={name} required />
			</div>
			<div class="grid gap-2">
				<Label>Koordinator</Label>
				<Select.Root type="single" bind:value={coordinatorId}>
					<Select.Trigger class="w-full">
						<Select.Trigger placeholder="Pilih Koordinator" />
					</Select.Trigger>
					<Select.Content>
						{#each data.coordinators as coord}
							<Select.Item value={coord.id} label={coord.name}>{coord.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<input type="hidden" name="coordinatorId" value={coordinatorId} />
			</div>
			<Dialog.Footer>
				<Button type="submit">Perbarui</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Confirmation Delete -->
<form method="POST" action="?/delete" use:enhance id="delete-form">
	<input type="hidden" name="id" value={deleteTargetId} />
	<ConfirmationDialog
		bind:open={isDeleteConfirmOpen}
		type="error"
		title="Hapus Laboratorium?"
		description="Tindakan ini tidak dapat dibatalkan. Semua data terkait laboratorium ini akan terhapus."
		onAction={() => {
			const form = document.getElementById('delete-form') as HTMLFormElement;
			form.requestSubmit();
		}}
	/>
</form>

<NotificationDialog
	bind:open={isNotificationOpen}
	type={notificationType}
	title={notificationTitle}
	description={notificationMessage}
	onAction={() => (isNotificationOpen = false)}
/>
