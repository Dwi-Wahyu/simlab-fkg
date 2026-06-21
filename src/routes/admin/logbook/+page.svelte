<script lang="ts">
	import { Plus, Pencil, Trash2, FileText } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';

	let { data } = $props();

	// Dialog state
	let showCreateDialog = $state(false);
	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);

	let editTarget = $state<(typeof data.templates)[0] | null>(null);
	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	let isSubmitting = $state(false);
	let selectedModuleId = $state('');
	let editModuleId = $state('');

	function openEdit(tpl: (typeof data.templates)[0]) {
		editTarget = tpl;
		editModuleId = tpl.moduleId ?? '';
		showEditDialog = true;
	}

	function formatDate(d: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		}).format(new Date(d));
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Manajemen Template Logbook</h1>
			<p class="text-muted-foreground">Kelola format template logbook yang digunakan mahasiswa.</p>
		</div>
		<Button onclick={() => (showCreateDialog = true)}>
			<Plus class="mr-2 h-4 w-4" /> Tambah Template
		</Button>
	</div>

	<!-- Tabel template -->
	<Card.Root class="overflow-hidden p-0">
		<Card.Content class="p-0">
			<Table.Root class="block md:table">
				<Table.Header class="hidden md:table-header-group">
					<Table.Row>
						<Table.Head>Nama Template</Table.Head>
						<Table.Head>Modul</Table.Head>
						<Table.Head>File</Table.Head>
						<Table.Head>Dibuat</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body class="block md:table-row-group">
					{#each data.templates as tpl (tpl.id)}
						<Table.Row class="flex flex-col border-b last:border-0 md:table-row">
							<Table.Cell class="p-4 font-medium">{tpl.name}</Table.Cell>
							<Table.Cell class="p-4 text-sm text-muted-foreground">
								{tpl.moduleName ?? '-'}
								{#if tpl.blockName}
									<span class="block text-xs opacity-60"
										>{tpl.blockName} — {tpl.departmentName}</span
									>
								{/if}
							</Table.Cell>
							<Table.Cell class="p-4">
								<div class="flex items-center gap-2 text-sm">
									<FileText class="h-4 w-4 text-muted-foreground" />
									<span class="max-w-50 truncate">{tpl.templateFilePath}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="p-4 text-sm text-muted-foreground">
								{formatDate(tpl.createdAt)}
							</Table.Cell>
							<Table.Cell class="p-4 text-right">
								<div class="flex justify-end gap-2">
									<Button variant="outline" size="sm" onclick={() => openEdit(tpl)}>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onclick={() => {
											deleteTarget = { id: tpl.id, name: tpl.name };
											showDeleteDialog = true;
										}}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="py-12 text-center text-muted-foreground">
								Belum ada template logbook. Klik "Tambah Template" untuk memulai.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>

<!-- Dialog Tambah -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Tambah Template Logbook</Dialog.Title>
			<Dialog.Description>Upload file .docx template dan kaitkan ke modul.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/create"
			enctype="multipart/form-data"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
					showCreateDialog = false;
				};
			}}
			class="flex flex-col gap-4 py-2"
		>
			<div class="flex flex-col gap-1.5">
				<Label for="name">Nama Template</Label>
				<Input id="name" name="name" placeholder="cth. Template Logbook CSL" required />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="moduleId">Modul</Label>
				<select
					name="moduleId"
					class="rounded-md border bg-background px-3 py-2 text-sm"
					required
					bind:value={selectedModuleId}
				>
					<option value="">Pilih Modul</option>
					{#each data.modules as mod}
						<option value={mod.id}>{mod.name} — {mod.blockName ?? '-'}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<Label for="file">File Template (.docx)</Label>
				<Input id="file" name="file" type="file" accept=".docx" required />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (showCreateDialog = false)}>
					Batal
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}Menyimpan...{:else}Simpan{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Dialog Edit -->
<Dialog.Root bind:open={showEditDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Template Logbook</Dialog.Title>
			<Dialog.Description>Ubah nama, modul, atau ganti file template.</Dialog.Description>
		</Dialog.Header>
		{#if editTarget}
			<form
				method="POST"
				action="?/update"
				enctype="multipart/form-data"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						await update();
						isSubmitting = false;
						showEditDialog = false;
					};
				}}
				class="flex flex-col gap-4 py-2"
			>
				<input type="hidden" name="id" value={editTarget.id} />
				<div class="flex flex-col gap-1.5">
					<Label for="edit-name">Nama Template</Label>
					<Input id="edit-name" name="name" value={editTarget.name} required />
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="edit-moduleId">Modul</Label>
					<select
						name="moduleId"
						class="rounded-md border bg-background px-3 py-2 text-sm"
						required
						bind:value={editModuleId}
					>
						<option value="">Pilih Modul</option>
						{#each data.modules as mod}
							<option value={mod.id}>{mod.name} — {mod.blockName ?? '-'}</option>
						{/each}
					</select>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="edit-file">
						Ganti File Template
						<span class="text-xs text-muted-foreground">(kosongkan jika tidak ingin mengganti)</span
						>
					</Label>
					<p class="flex items-center gap-1 text-xs text-muted-foreground">
						<FileText class="h-3 w-3" /> File saat ini: {editTarget.templateFilePath}
					</p>
					<Input id="edit-file" name="file" type="file" accept=".docx" />
				</div>
				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={() => (showEditDialog = false)}>
						Batal
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}Menyimpan...{:else}Simpan Perubahan{/if}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Dialog Hapus -->
<ConfirmationDialog
	bind:open={showDeleteDialog}
	type="error"
	title="Hapus Template"
	description="Template '{deleteTarget?.name}' akan dihapus permanen beserta filenya. Tindakan ini tidak dapat dibatalkan."
	actionLabel="Hapus"
	onAction={async () => {
		if (!deleteTarget) return;
		const fd = new FormData();
		fd.append('id', deleteTarget.id);
		await fetch('?/delete', { method: 'POST', body: fd });
		showDeleteDialog = false;
		location.reload();
	}}
/>
