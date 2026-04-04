<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Plus, User, Building2, UserCog } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';

	let { data, form } = $props();
	let isCreateModalOpen = $state(false);

	const roles = [
		{ value: 'superadmin', label: 'Superadmin' },
		{ value: 'koordinator', label: 'Koordinator' },
		{ value: 'kepalaLab', label: 'Kepala Lab' },
		{ value: 'instruktur', label: 'Instruktur' },
		{ value: 'peneliti', label: 'Peneliti (Mahasiswa)' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'teknisi', label: 'Teknisi' },
		{ value: 'spmi', label: 'SPMI' }
	];

	function getRoleLabel(roleValue: string) {
		return roles.find((r) => r.value === roleValue)?.label || roleValue;
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Manajemen Pengguna</h1>
			<p class="text-muted-foreground">Kelola pengguna dan akses mereka ke laboratorium.</p>
		</div>
		<Dialog.Root bind:open={isCreateModalOpen}>
			<Dialog.Trigger>
				<Button>
					<Plus class="mr-2 h-4 w-4" />
					Tambah Pengguna
				</Button>
			</Dialog.Trigger>
			<Dialog.Content class="max-w-md">
				<Dialog.Header>
					<Dialog.Title>Tambah Pengguna Baru</Dialog.Title>
					<Dialog.Description>
						Buat akun pengguna baru dan tentukan laboratoriumnya.
					</Dialog.Description>
				</Dialog.Header>
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								isCreateModalOpen = false;
							}
						};
					}}
					class="space-y-4 py-4"
				>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="name">Nama Lengkap</Label>
							<Input id="name" name="name" required />
						</div>
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input id="email" name="email" type="email" required />
						</div>
					</div>
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input id="password" name="password" type="password" required />
					</div>

					<div class="border-t pt-4">
						<h3 class="mb-2 text-sm font-medium">Penugasan Laboratorium</h3>
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="laboratoriumId">Laboratorium</Label>
								<select
									name="laboratoriumId"
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								>
									<option value="">Pilih Laboratorium</option>
									{#each data.laboratoriums as lab}
										<option value={lab.id}>{lab.name}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-2">
								<Label for="labRole">Role di Lab</Label>
								<select
									name="labRole"
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{#each roles as role}
										<option value={role.value}>{role.label}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>

					<Dialog.Footer>
						<Button type="button" variant="outline" onclick={() => (isCreateModalOpen = false)}
							>Batal</Button
						>
						<Button type="submit">Simpan</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	{#if form?.message}
		<div class="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
			{form.message}
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Daftar Pengguna</Card.Title>
			<Card.Description>
				Terdapat total {data.users.length} pengguna terdaftar.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Pengguna</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Laboratorium & Role</Table.Head>
						<Table.Head>Dibuat Pada</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.users as u}
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="flex items-center gap-2">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
										<User class="h-4 w-4" />
									</div>
									{u.name}
								</div>
							</Table.Cell>
							<Table.Cell>{u.email}</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									{#each u.members as member}
										<div class="flex items-center gap-2 text-xs">
											<span
												class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
											>
												{member.laboratorium.name}
											</span>
											<span class="text-muted-foreground">
												{getRoleLabel(member.role)}
											</span>
										</div>
									{:else}
										<span class="text-xs text-muted-foreground italic">Tidak ada penugasan</span>
									{/each}
								</div>
							</Table.Cell>
							<Table.Cell>{new Date(u.createdAt).toLocaleDateString('id-ID')}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									<Button variant="ghost" size="icon">
										<UserCog class="h-4 w-4" />
									</Button>
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="userId" value={u.id} />
										<Button
											variant="ghost"
											size="icon"
											type="submit"
											class="text-destructive hover:bg-destructive/10 hover:text-destructive"
										>
											<Plus class="h-4 w-4 rotate-45" />
										</Button>
									</form>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="h-24 text-center"> Belum ada pengguna. </Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
