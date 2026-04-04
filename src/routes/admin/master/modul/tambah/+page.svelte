<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronLeft, Loader2, Save } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data, form } = $props();

	let selectedBlockId = $state('');
	let isLoading = $state(false);
	let showSuccessDialog = $state(false);

	const blockTrigger = $derived(
		data.blocks.find((b) => b.id === selectedBlockId)?.name ?? 'Pilih Blok'
	);

	$effect(() => {
		if (form?.success) {
			showSuccessDialog = true;
		}
	});

	function handleSuccessAction() {
		showSuccessDialog = false;
		goto('/admin/master/modul');
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Tambah Modul Praktikum</h1>
		<p class="text-muted-foreground">Buat modul praktikum baru untuk sistem.</p>
	</div>

	<div class="mx-auto w-full max-w-2xl">
		<Card.Root>
			<form
				method="POST"
				use:enhance={() => {
					isLoading = true;
					return async ({ result }) => {
						isLoading = false;
						if (result.type === 'success') {
							showSuccessDialog = true;
						}
					};
				}}
			>
				<Card.Header>
					<Card.Title>Informasi Modul</Card.Title>
					<Card.Description>Lengkapi detail modul praktikum di bawah ini.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid gap-2">
						<Label for="name">Nama Modul</Label>
						<Input id="name" name="name" placeholder="Misal: Modul Sterilisasi Alat" required />
					</div>

					<div class="grid gap-2">
						<Label for="block">Blok</Label>
						<Select.Root type="single" name="blockId" bind:value={selectedBlockId} required>
							<Select.Trigger class="w-full text-left">
								{blockTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each data.blocks as block (block.id)}
									<Select.Item value={block.id} label={block.name}>
										<div class="flex flex-col">
											<span>{block.name}</span>
											<span class="text-xs text-muted-foreground">{block.departmentName}</span>
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input type="hidden" name="blockId" value={selectedBlockId} />
					</div>

					<div class="grid gap-2">
						<Label for="description">Deskripsi (Opsional)</Label>
						<Textarea
							id="description"
							name="description"
							placeholder="Jelaskan detail modul di sini..."
							rows={4}
						/>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-end gap-2 border-t px-6 py-4">
					<Button variant="outline" href="/admin/master/modul" disabled={isLoading}>Batal</Button>
					<Button type="submit" disabled={isLoading}>
						{#if isLoading}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Menyimpan...
						{:else}
							<Save class="mr-2 size-4" />
							Simpan Modul
						{/if}
					</Button>
				</Card.Footer>
			</form>
		</Card.Root>
	</div>
</div>

<NotificationDialog
	bind:open={showSuccessDialog}
	type="success"
	title="Berhasil!"
	description="Modul praktikum baru telah berhasil ditambahkan."
	actionLabel="Ke Daftar Modul"
	onAction={handleSuccessAction}
/>
