<script lang="ts">
	import {
		Calendar,
		ChevronDown,
		ChevronUp,
		Clock,
		Edit,
		Info,
		MapPin,
		Plus,
		Trash2,
		Users
	} from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import type { PageData } from './$types';

	let { data, form } = $props();
	let isInfoModalOpen = $state(false);

	// Notification State
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');

	// Confirmation State
	let showConfirmDelete = $state(false);
	let scheduleIdToDelete = $state<string | null>(null);
	let isDeleting = $state(false);

	// Current Schedule for Info
	type ScheduleItem = PageData['schedules'][0];
	let currentSchedule = $state<ScheduleItem | null>(null);

	let expandedSchedules = $state<Record<string, boolean>>({});

	function toggleExpand(id: string) {
		expandedSchedules[id] = !expandedSchedules[id];
	}

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(date));
	}

	function openInfo(schedule: ScheduleItem) {
		currentSchedule = schedule;
		isInfoModalOpen = true;
	}

	function confirmDelete(id: string) {
		scheduleIdToDelete = id;
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
	title="Hapus Jadwal?"
	description="Tindakan ini tidak dapat dibatalkan. Jadwal akan dihapus secara permanen."
	loading={isDeleting}
	onAction={async () => {
		if (!scheduleIdToDelete) return;
		isDeleting = true;

		const formData = new FormData();
		formData.append('id', scheduleIdToDelete);

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
				notificationDescription = 'Terjadi kesalahan saat menghapus jadwal.';
				showNotification = true;
			}
		} catch {
			notificationType = 'error';
			notificationTitle = 'Gagal!';
			notificationDescription = 'Terjadi kesalahan jaringan.';
			showNotification = true;
		} finally {
			isDeleting = false;
			scheduleIdToDelete = null;
		}
	}}
/>

<!-- Info Dialog -->
<Dialog.Root bind:open={isInfoModalOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Detail Jadwal</Dialog.Title>
			<Dialog.Description>Informasi lengkap kegiatan laboratorium.</Dialog.Description>
		</Dialog.Header>
		{#if currentSchedule}
			<div class="space-y-4 py-4">
				<div class="grid grid-cols-3 gap-2">
					<span class="text-sm font-medium text-muted-foreground">Judul</span>
					<span class="col-span-2 text-sm font-bold">{currentSchedule.title}</span>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<span class="text-sm font-medium text-muted-foreground">Jenis & Kelas</span>
					<div class="col-span-2 flex gap-2">
						<span class={badgeVariants({ variant: 'secondary' })}>{currentSchedule.type}</span>
						<span class={badgeVariants({ variant: 'outline' })}>Kelas {currentSchedule.class}</span>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<span class="text-sm font-medium text-muted-foreground">Lokasi</span>
					<span class="col-span-2 text-sm">{currentSchedule.laboratorium.name}</span>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<span class="text-sm font-medium text-muted-foreground">DPJP</span>
					<div class="col-span-2 flex flex-col gap-1">
						{#each [...new Map(currentSchedule.instructors.map((i: any) => [i.instructorId, i])).values()] as instr (instr.instructorId)}
							<span class="text-sm">• {instr.user.name}</span>
						{/each}
					</div>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<span class="text-sm font-medium text-muted-foreground">Waktu</span>
					<div class="col-span-2 flex flex-col gap-1 text-sm">
						<span
							>{new Date(currentSchedule.startTime).toLocaleDateString('id-ID', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
								year: 'numeric'
							})}</span
						>
						<span
							>{formatTime(currentSchedule.startTime)} - {formatTime(currentSchedule.endTime)}</span
						>
					</div>
				</div>
				<div class="grid grid-cols-3 gap-2">
					<span class="text-sm font-medium text-muted-foreground">Peserta</span>
					<span class="col-span-2 text-sm">{currentSchedule.participantCount} orang</span>
				</div>
				{#if currentSchedule.notes}
					<div class="border-t pt-2">
						<span class="text-sm font-medium text-muted-foreground">Catatan</span>
						<p class="mt-1 text-sm text-muted-foreground">{currentSchedule.notes}</p>
					</div>
				{/if}
			</div>
		{/if}
		<Dialog.Footer>
			<Button onclick={() => (isInfoModalOpen = false)}>Tutup</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<div class="flex h-full flex-col gap-6 p-4 sm:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Jadwal Praktikum</h1>
			<p class="text-muted-foreground">
				Kelola jadwal praktikum, OSCE, dan pelatihan di laboratorium.
			</p>
		</div>
		{#if data.userRole !== 'instruktur'}
			<Button href="/admin/jadwal-praktikum/tambah" class="w-full justify-center gap-2  sm:w-auto">
				<Plus class="size-4" />
				Tambah Jadwal
			</Button>
		{/if}
	</div>

	{#if form?.message}
		<div class="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
			{form.message}
		</div>
	{/if}

	<div class="overflow-hidden rounded-md border bg-card shadow-sm">
		<Table.Root class="block md:table">
			<Table.Header class="hidden md:table-header-group">
				<Table.Row class="md:table-row">
					<Table.Head>Kegiatan</Table.Head>
					<Table.Head>Waktu & Lokasi</Table.Head>
					<Table.Head>DPJP</Table.Head>
					<Table.Head>Peserta</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body class="block md:table-row-group">
				{#each data.schedules as schedule (schedule.id)}
					<Table.Row
						onclick={() => toggleExpand(schedule.id)}
						class="flex flex-col border-b last:border-0 md:table-row md:border-b"
					>
						<!-- Column 1: Kegiatan (always visible on mobile, header-like) -->
						<Table.Cell
							class="flex items-center justify-between border-b-0 p-4 whitespace-normal md:table-cell md:border-b md:p-4"
						>
							<div class="flex flex-col gap-1">
								<span class="text-base font-bold md:text-sm">{schedule.title}</span>
								<div class="flex flex-wrap gap-2">
									<span class={badgeVariants({ variant: 'secondary' })}>{schedule.type}</span>
									<span class={badgeVariants({ variant: 'outline' })}>Kelas {schedule.class}</span>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="ml-4 h-8 w-8 shrink-0 md:hidden"
								aria-label="Expand row"
							>
								{#if expandedSchedules[schedule.id]}
									<ChevronUp class="h-4 w-4" />
								{:else}
									<ChevronDown class="h-4 w-4" />
								{/if}
							</Button>
						</Table.Cell>

						<!-- Column 2: Waktu & Lokasi -->
						<Table.Cell
							class="{expandedSchedules[schedule.id]
								? 'flex'
								: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
						>
							<span class="text-xs font-semibold text-slate-400 md:hidden">Waktu & Lokasi</span>
							<div class="flex flex-col gap-1 text-sm text-slate-900">
								<div class="flex items-center gap-1.5">
									<Calendar class="h-3.5 w-3.5 text-muted-foreground" />
									{new Date(schedule.startTime).toLocaleDateString('id-ID', {
										weekday: 'short',
										day: 'numeric',
										month: 'short'
									})}
								</div>
								<div class="flex items-center gap-1.5">
									<Clock class="h-3.5 w-3.5 text-muted-foreground" />
									{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
								</div>
								<div class="flex items-center gap-1.5">
									<MapPin class="h-3.5 w-3.5 text-muted-foreground" />
									{schedule.laboratorium.name}
								</div>
							</div>
						</Table.Cell>

						<!-- Column 3: DPJP -->
						<Table.Cell
							class="{expandedSchedules[schedule.id]
								? 'flex'
								: 'hidden'} flex-col gap-1.5 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
						>
							<span class="mb-0.5 text-xs font-semibold text-slate-400 md:hidden">DPJP</span>
							<div class="flex flex-wrap gap-2">
								{#each [...new Map(schedule.instructors.map((i: any) => [i.instructorId, i])).values()] as instr (instr.instructorId)}
									<div
										class="flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5"
									>
										<div
											class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
										>
											{instr.user.name.charAt(0)}
										</div>
										<span class="text-xs">{instr.user.name}</span>
									</div>
								{:else}
									<span class="text-xs text-muted-foreground italic">Belum ditentukan</span>
								{/each}
							</div>
						</Table.Cell>

						<!-- Column 4: Peserta -->
						<Table.Cell
							class="{expandedSchedules[schedule.id]
								? 'flex'
								: 'hidden'} flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 md:table-cell md:border-b md:bg-transparent md:p-4"
						>
							<span class="text-xs font-semibold text-slate-400 md:hidden">Peserta</span>
							<div class="flex items-center gap-1.5 text-sm text-slate-900">
								<Users class="h-3.5 w-3.5 text-muted-foreground" />
								{schedule.participantCount} orang
							</div>
						</Table.Cell>

						<!-- Column 5: Aksi -->
						<Table.Cell
							class="{expandedSchedules[schedule.id]
								? 'flex'
								: 'hidden'} justify-end border-b-0 bg-slate-50/50 p-4 md:table-cell md:border-b md:bg-transparent md:p-4 md:pr-6"
						>
							<div class="flex w-full justify-end gap-2 md:w-auto">
								<Button
									variant="ghost"
									size="icon"
									class="h-8 w-8"
									onclick={() => openInfo(schedule)}
								>
									<Info class="h-4 w-4" />
								</Button>
								{#if data.userRole !== 'instruktur'}
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										href="/admin/jadwal-praktikum/{schedule.id}/edit"
									>
										<Edit class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
										onclick={() => confirmDelete(schedule.id)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row class="flex flex-col md:table-row">
						<Table.Cell colspan={5} class="h-24 text-center md:table-cell">
							Belum ada jadwal kegiatan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
