<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { ChevronLeft, Loader2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);
	let isSuccessOpen = $state(false);

	const userLabId = $derived(data.targetUser?.members?.[0]?.laboratoriumId || '');

	$effect(() => {
		if (form?.success) {
			isSuccessOpen = true;
		}
	});
</script>

<NotificationDialog
	bind:open={isSuccessOpen}
	title="Berhasil"
	description={form?.message || 'Data berhasil diperbarui'}
	type="success"
	onAction={() => goto(`/admin/users/${data.roleSlug}`)}
/>

<div class="flex flex-col gap-6 p-6">
	<div class="mx-auto flex w-full max-w-2xl items-center gap-4">
		<Button variant="outline" size="icon" href="/admin/users/{data.roleSlug}">
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<div class="flex flex-col gap-1">
			<h1 class="text-3xl font-bold tracking-tight">Edit {data.roleLabel}</h1>
			<p class="text-muted-foreground">Perbarui data akun {data.targetUser.name}.</p>
		</div>
	</div>

	<div class="mx-auto w-full max-w-2xl">
		<Card.Root>
			<Card.Header>
				<Card.Title>Informasi Pengguna</Card.Title>
				<Card.Description>Edit data akun berikut.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form
					method="POST"
					action="?/update"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							update();
						};
					}}
					class="space-y-6"
				>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div class="space-y-2">
							<Label for="name">Nama Lengkap</Label>
							<Input id="name" name="name" value={data.targetUser.name} required />
						</div>
						<div class="space-y-2">
							<Label for="username">NIP / Username</Label>
							<Input id="username" name="username" value={data.targetUser.username} required />
						</div>
					</div>

					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input id="email" name="email" type="email" value={data.targetUser.email} required />
					</div>

					<div class="space-y-2 border-t pt-6">
						<Label for="laboratoriumId">Penugasan Laboratorium</Label>
						<select
							id="laboratoriumId"
							name="laboratoriumId"
							required={data.role === 'kepalaLab' || data.role === 'laboran'}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="">Pilih Laboratorium</option>
							{#each data.laboratoriums as lab}
								<option value={lab.id} selected={lab.id === userLabId}>{lab.name}</option>
							{/each}
						</select>
						{#if data.role === 'kepalaLab' || data.role === 'laboran'}
							<p class="text-xs text-destructive italic font-medium">
								Wajib: Tentukan laboratorium penugasan.
							</p>
						{:else}
							<p class="text-xs text-muted-foreground italic">
								Opsional: Tentukan laboratorium jika sudah diketahui.
							</p>
						{/if}
					</div>

					{#if form?.message && !form.success}
						<div class="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
							{form.message}
						</div>
					{/if}

					<div class="flex justify-end gap-3 pt-4">
						<Button variant="outline" href="/admin/users/{data.roleSlug}">Batal</Button>
						<Button type="submit" disabled={loading} class="min-w-[120px]">
							{#if loading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Menyimpan...
							{:else}
								Simpan Perubahan
							{/if}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
