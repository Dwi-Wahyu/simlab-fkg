<script lang="ts">
	import { AlertCircle, Check, ChevronLeft, Plus, Search, Trash2, Users } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/components/toast';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Client-side search and filters
	let searchQuery = $state('');
	let filterBatch = $state('');
	let showAllStudents = $state(false);

	// Compute list of current member user IDs
	const memberUserIds = $derived(new Set(data.members.map((m: any) => m.userId)));

	// Filtered available students list
	const availableStudents = $derived.by(() => {
		// Base list: either all students system-wide or only students in this class
		let baseList = showAllStudents
			? data.allStudents
			: data.classMembers.map((cm: any) => cm.user).filter(Boolean);

		// Filter out those who are already members
		baseList = baseList.filter((s: any) => !memberUserIds.has(s.id));

		// Filter by search query (name or NIM/username)
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			baseList = baseList.filter(
				(s: any) =>
					s.name?.toLowerCase().includes(query) ||
					s.username?.toLowerCase().includes(query) ||
					s.email?.toLowerCase().includes(query)
			);
		}

		// Filter by batch/angkatan (for system-wide view or class-based check)
		// We extract the batch by looking at their username (first 4 digits of NIM) or using the selected class batch
		if (filterBatch) {
			baseList = baseList.filter((s: any) => {
				// NIM in FKG usually contains cohort year or batch prefix.
				// We check if username starts with the batch year or has it in the pattern
				// Usually, we can check s.username (e.g. j11121102 becomes 2021 cohort)
				// Let's check: J111 21 -> 2021. So we can check if the NIM characters 4-6 contain the last 2 digits of the batch!
				const lastTwoDigits = filterBatch.slice(-2);
				return (
					s.username?.toLowerCase().includes(lastTwoDigits) ||
					s.email?.toLowerCase().includes(lastTwoDigits)
				);
			});
		}

		return baseList;
	});

	function handleActionSubmit(actionName: string) {
		return async ({ result }: any) => {
			if (result.type === 'success' || result.type === 'redirect' || result.data?.success) {
				const msg = result.data?.message || 'Aksi berhasil dilakukan';
				toast.success('Berhasil', { description: msg });
			} else if (result.type === 'failure') {
				const errMsg = result.data?.message || 'Terjadi kesalahan.';
				toast.destructive('Gagal', { description: errMsg });
			}
		};
	}

	const selectedBatchLabel = $derived(filterBatch ? `Angkatan ${filterBatch}` : 'Pilih Angkatan');
</script>

<div class="flex flex-col gap-6 p-4 md:p-6">
	<!-- Page Header -->
	<div class="flex flex-col gap-3">
		<a
			href="/admin/kelompok-mahasiswa"
			class="flex w-fit items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
		>
			<ChevronLeft class="size-4" />
			Kembali ke Daftar Kelompok
		</a>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900">{data.kelompok.name}</h1>
					<span
						class="inline-flex items-center rounded-md bg-[#2D5A43]/10 px-2 py-1 text-xs font-medium text-[#2D5A43] ring-1 ring-[#2D5A43]/20 ring-inset"
					>
						{data.kelompok.class?.name} ({data.kelompok.class?.batch})
					</span>
				</div>
				<p class="text-slate-500">Kelola dan alokasikan mahasiswa ke dalam kelompok belajar ini.</p>
			</div>
		</div>
	</div>

	<!-- Main Two-Panel Grid Layout -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Left Panel: Available Students -->
		<Card.Root class="flex h-[650px] flex-col">
			<Card.Header class="border-b pb-4">
				<Card.Title class="text-lg font-semibold text-slate-900">Mahasiswa Tersedia</Card.Title>
				<Card.Description>Pilih mahasiswa untuk dimasukkan ke kelompok ini.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
				<!-- Search and Filter Bar -->
				<div class="flex flex-col gap-3">
					<div class="relative w-full">
						<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input placeholder="Cari nama atau NIM..." class="pl-10" bind:value={searchQuery} />
					</div>

					<div class="flex items-center justify-between gap-4">
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="toggle-all"
								bind:checked={showAllStudents}
								class="h-4 w-4 rounded border-slate-300 text-[#2D5A43] focus:ring-[#2D5A43]"
							/>
							<Label for="toggle-all" class="cursor-pointer text-xs font-medium text-slate-600">
								Tampilkan Semua Mahasiswa (System-wide)
							</Label>
						</div>

						{#if showAllStudents}
							<Select.Root
								type="single"
								value={filterBatch}
								onValueChange={(val) => (filterBatch = val || '')}
							>
								<Select.Trigger class="h-8 w-[150px] bg-white text-xs">
									{selectedBatchLabel}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="" label="Semua Angkatan">Semua Angkatan</Select.Item>
									{#each data.batches as batch}
										<Select.Item value={batch} label={`Angkatan ${batch}`}>
											Angkatan {batch}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{/if}
					</div>
				</div>

				<!-- Student List -->
				<div class="min-h-0 flex-1 overflow-y-auto rounded-md border">
					<Table.Root>
						<Table.Header class="sticky top-0 z-10 bg-slate-50">
							<Table.Row>
								<Table.Head>Nama / NIM</Table.Head>
								<Table.Head class="w-[100px] text-right">Aksi</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if availableStudents.length === 0}
								<Table.Row>
									<Table.Cell colspan={2} class="h-24 text-center text-xs text-slate-500">
										Tidak ada mahasiswa tersedia.
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each availableStudents as student (student.id)}
									<Table.Row class="hover:bg-slate-50/50">
										<Table.Cell>
											<div class="flex flex-col">
												<span class="text-sm font-medium text-slate-900">{student.name}</span>
												<span class="text-xs text-slate-500 uppercase">{student.username}</span>
											</div>
										</Table.Cell>
										<Table.Cell class="text-right">
											<form
												method="POST"
												action="?/addMember"
												use:enhance={() => handleActionSubmit('addMember')}
											>
												<input type="hidden" name="userId" value={student.id} />
												<Button
													type="submit"
													size="sm"
													class="h-8 gap-1 bg-[#2D5A43] px-3 text-white hover:bg-[#234735]"
												>
													<Plus class="size-3.5" /> Tambah
												</Button>
											</form>
										</Table.Cell>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Right Panel: Group Members -->
		<Card.Root class="flex h-[650px] flex-col border-slate-200">
			<Card.Header class="border-b bg-slate-50/50 pb-4">
				<div class="flex items-center justify-between">
					<Card.Title class="flex items-center gap-2 text-lg font-semibold text-slate-900">
						Anggota Kelompok
						<span
							class="inline-flex size-6 items-center justify-center rounded-full bg-[#2D5A43] text-[11px] font-bold text-white"
						>
							{data.members.length}
						</span>
					</Card.Title>
				</div>
				<Card.Description>Mahasiswa yang terdaftar di dalam kelompok ini.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
				<!-- Running Count Warning if Empty -->
				{#if data.members.length === 0}
					<div
						class="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-slate-400"
					>
						<Users class="size-8 stroke-[1.5]" />
						<p class="text-sm">Belum ada anggota di kelompok ini.</p>
					</div>
				{:else}
					<div class="flex-1 overflow-y-auto rounded-md border">
						<Table.Root>
							<Table.Header class="sticky top-0 z-10 bg-slate-50">
								<Table.Row>
									<Table.Head>Nama / NIM</Table.Head>
									<Table.Head class="w-[100px] text-right">Aksi</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.members as member (member.id)}
									<Table.Row class="hover:bg-slate-50/50">
										<Table.Cell>
											<div class="flex flex-col">
												<span class="text-sm font-medium text-slate-900">{member.user?.name}</span>
												<span class="text-xs text-slate-500 uppercase">{member.user?.username}</span
												>
											</div>
										</Table.Cell>
										<Table.Cell class="text-right">
											<form
												method="POST"
												action="?/removeMember"
												use:enhance={() => handleActionSubmit('removeMember')}
											>
												<input type="hidden" name="userId" value={member.user?.id} />
												<Button
													type="submit"
													size="sm"
													variant="outline"
													class="h-8 gap-1 border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
												>
													<Trash2 class="size-3.5" /> Hapus
												</Button>
											</form>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
