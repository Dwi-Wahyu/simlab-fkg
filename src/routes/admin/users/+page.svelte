<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import {
		Plus,
		User,
		Building2,
		UserCog,
		Search,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		ChevronUp,
		ChevronDown
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import { goto } from '$app/navigation';
	import { page as pageStore } from '$app/state';
	import { untrack } from 'svelte';
	import { cn } from '$lib/utils';

	let { data, form } = $props();
	let isCreateModalOpen = $state(false);

	const roles = [
		{ value: 'superadmin', label: 'Superadmin' },
		{ value: 'koordinator', label: 'PJ Mata Kuliah' },
		{ value: 'kepalaLab', label: 'Kepala Lab' },
		{ value: 'instruktur', label: 'DPJP' },
		{ value: 'peneliti', label: 'Mahasiswa' },
		{ value: 'admin', label: 'Admin' },
		{ value: 'teknisi', label: 'Teknisi' },
		{ value: 'spmi', label: 'SPMI' },
		{ value: 'laboran', label: 'Laboran' }
	];

	function getRoleLabel(roleValue: string) {
		return roles.find((r) => r.value === roleValue)?.label || roleValue;
	}

	let searchQuery = $state(pageStore.url.searchParams.get('search') || '');
	let debounceTimer: any;
	let expandedItems = $state<Record<string, boolean>>({});

	function updateUrl(params: Record<string, string | number | undefined>) {
		const url = new URL(pageStore.url);
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === '') {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, value.toString());
			}
		});
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			updateUrl({ search: searchQuery, page: 1 });
		}, 300);
	}

	function handlePageChange(newPage: number) {
		updateUrl({ page: newPage });
	}

	function handleLimitChange(newLimit: string) {
		updateUrl({ limit: newLimit, page: 1 });
	}

	$effect(() => {
		const urlSearch = pageStore.url.searchParams.get('search') || '';
		untrack(() => {
			if (searchQuery !== urlSearch) {
				searchQuery = urlSearch;
			}
		});
	});
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
					<Plus class="h-4 w-4 mr-2" />
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
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

	{#await data.usersPromise}
		<!-- Skeleton Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="h-10 w-full max-w-sm animate-pulse rounded-md bg-slate-200"></div>
			<div class="h-10 w-32 animate-pulse rounded-md bg-slate-200"></div>
		</div>

		<!-- Skeleton Table -->
		<div class="rounded-md border bg-white shadow-sm animate-pulse">
			<div class="overflow-x-auto">
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
						{#each Array(5) as _}
							<Table.Row>
								{#each Array(5) as _}
									<Table.Cell>
										<div class="h-5 w-full rounded bg-slate-100"></div>
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	{:then res}
		<!-- Table Controls -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
				<Input
					placeholder="Cari pengguna..."
					class="pl-10"
					bind:value={searchQuery}
					oninput={handleSearch}
				/>
			</div>
			<div class="flex items-center gap-2">
				<Select.Root
					type="single"
					value={res.pagination.limit.toString()}
					onValueChange={handleLimitChange}
				>
					<Select.Trigger class="w-[110px]">
						{res.pagination.limit} / Hal
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10" label="10 / Halaman">10 / Hal</Select.Item>
						<Select.Item value="25" label="25 / Halaman">25 / Hal</Select.Item>
						<Select.Item value="50" label="50 / Halaman">50 / Hal</Select.Item>
						<Select.Item value="100" label="100 / Halaman">100 / Hal</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Data Card Container with Table -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Daftar Pengguna</Card.Title>
				<Card.Description>
					Terdapat total {res.pagination.totalItems} pengguna terdaftar.
				</Card.Description>
			</Card.Header>
			<Card.Content class="p-0 md:p-6">
				<div class="rounded-md border bg-white shadow-sm overflow-hidden">
					<Table.Root class="block md:table">
						<Table.Header class="hidden md:table-header-group">
							<Table.Row class="md:table-row">
								<Table.Head class="px-6 py-4">Pengguna</Table.Head>
								<Table.Head>Email</Table.Head>
								<Table.Head>Laboratorium & Role</Table.Head>
								<Table.Head>Dibuat Pada</Table.Head>
								<Table.Head class="pr-6 text-right">Aksi</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body class="block md:table-row-group">
							{#each res.users as u (u.id)}
								<Table.Row class="group flex flex-col border-b last:border-0 hover:bg-slate-50/50 md:table-row md:border-b">
									<!-- Pengguna Cell -->
									<Table.Cell class="flex items-center justify-between border-b-0 p-4 md:table-cell md:border-b md:px-6 md:py-4">
										<div class="flex items-center gap-2">
											<div class="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
												<User class="h-4 w-4" />
											</div>
											<span class="font-bold text-slate-900 md:font-medium">{u.name}</span>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="ml-4 h-8 w-8 shrink-0 md:hidden"
											onclick={() => (expandedItems[u.id] = !expandedItems[u.id])}
											aria-label="Expand row"
										>
											{#if expandedItems[u.id]}
												<ChevronUp class="h-4 w-4" />
											{:else}
												<ChevronDown class="h-4 w-4" />
											{/if}
										</Button>
									</Table.Cell>

									<!-- Email Cell -->
									<Table.Cell
										class={cn(
											expandedItems[u.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Email</span>
										<span class="text-sm text-slate-600">{u.email}</span>
									</Table.Cell>

									<!-- Laboratorium & Role Cell -->
									<Table.Cell
										class={cn(
											expandedItems[u.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Laboratorium & Role</span>
										<div class="flex flex-col gap-1">
											{#each u.members as member}
												<div class="flex flex-wrap items-center gap-2 text-xs">
													{#if member.laboratorium}
														<span
															class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
														>
															{member.laboratorium.name}
														</span>
													{/if}
													<span class="text-muted-foreground">
														{getRoleLabel(member.role)}
													</span>
												</div>
											{:else}
												<span class="text-xs text-muted-foreground italic">Tidak ada penugasan</span>
											{/each}
										</div>
									</Table.Cell>

									<!-- Dibuat Pada Cell -->
									<Table.Cell
										class={cn(
											expandedItems[u.id] ? 'flex' : 'hidden',
											'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:px-6 md:py-4'
										)}
									>
										<span class="text-xs font-semibold text-slate-400 md:hidden">Dibuat Pada</span>
										<span class="text-sm text-slate-600">{new Date(u.createdAt).toLocaleDateString('id-ID')}</span>
									</Table.Cell>

									<!-- Aksi Cell -->
									<Table.Cell
										class={cn(
											expandedItems[u.id] ? 'flex' : 'hidden',
											'justify-end border-b-0 px-4 py-3 md:table-cell md:border-b md:px-6 md:py-4'
										)}
									>
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
									<Table.Cell colspan={5} class="h-24 text-center text-muted-foreground">Belum ada pengguna.</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>

					<!-- Pagination Footer -->
					<div class="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50/30 p-4 gap-4">
						<div class="text-xs font-semibold text-slate-500">
							Menampilkan {res.users.length > 0 ? (res.pagination.currentPage - 1) * res.pagination.limit + 1 : 0} sampai {Math.min(res.pagination.totalItems, res.pagination.currentPage * res.pagination.limit)} dari {res.pagination.totalItems} pengguna
						</div>
						<div class="flex items-center space-x-2">
							<Button
								variant="outline"
								size="icon"
								class="hidden h-8 w-8 lg:flex"
								onclick={() => handlePageChange(1)}
								disabled={res.pagination.currentPage === 1}
							>
								<ChevronsLeft class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={() => handlePageChange(res.pagination.currentPage - 1)}
								disabled={res.pagination.currentPage === 1}
							>
								<ChevronLeft class="h-4 w-4" />
							</Button>
							<div class="flex items-center justify-center text-sm font-medium text-slate-700">
								Halaman {res.pagination.currentPage} dari {res.pagination.totalPages}
							</div>
							<Button
								variant="outline"
								size="icon"
								class="h-8 w-8"
								onclick={() => handlePageChange(res.pagination.currentPage + 1)}
								disabled={res.pagination.currentPage === res.pagination.totalPages || res.pagination.totalPages === 0}
							>
								<ChevronRight class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="hidden h-8 w-8 lg:flex"
								onclick={() => handlePageChange(res.pagination.totalPages)}
								disabled={res.pagination.currentPage === res.pagination.totalPages || res.pagination.totalPages === 0}
							>
								<ChevronsRight class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/await}
</div>
