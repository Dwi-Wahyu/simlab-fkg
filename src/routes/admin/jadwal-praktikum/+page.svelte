<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Plus, Calendar, Clock, MapPin, Users, Info, Trash2, Edit } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import { badgeVariants } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { invalidateAll } from '$app/navigation';

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
	let currentSchedule = $state<any>(null);

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(new Date(date));
	}

	function openInfo(schedule: any) {
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
		} catch (e) {
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
					<span class="text-sm font-medium text-muted-foreground">Instruktur</span>
					<div class="col-span-2 flex flex-col gap-1">
						{#each currentSchedule.instructors as instr}
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

<div class="flex h-full flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Jadwal Praktikum</h1>
			<p class="text-muted-foreground">
				Kelola jadwal praktikum, OSCE, dan pelatihan di laboratorium.
			</p>
		</div>
		<Button href="/admin/jadwal-praktikum/tambah">
			<Plus class="mr-2 h-4 w-4" />
			Tambah Jadwal
		</Button>
	</div>

	{#if form?.message}
		<div class="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">
			{form.message}
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Daftar Kegiatan Terjadwal</Card.Title>
			<Card.Description>
				Terdapat {data.schedules.length} kegiatan yang sudah terjadwal.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Kegiatan</Table.Head>
						<Table.Head>Waktu & Lokasi</Table.Head>
						<Table.Head>Instruktur</Table.Head>
						<Table.Head>Peserta</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.schedules as schedule (schedule.id)}
						<Table.Row>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									<span class="font-bold">{schedule.title}</span>
									<div class="flex gap-2">
										<span class={badgeVariants({ variant: 'secondary' })}>{schedule.type}</span>
										<span class={badgeVariants({ variant: 'outline' })}>Kelas {schedule.class}</span
										>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1 text-sm">
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
							<Table.Cell>
								<div class="flex flex-wrap gap-2">
									{#each schedule.instructors as instr}
										<div class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5">
											<div
												class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground"
											>
												{instr.user.name.charAt(0)}
											</div>
											<span class="text-xs">{instr.user.name}</span>
										</div>
									{/each}
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1.5">
									<Users class="h-3.5 w-3.5 text-muted-foreground" />
									{schedule.participantCount} orang
								</div>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									<Button variant="ghost" size="icon" onclick={() => openInfo(schedule)}>
										<Info class="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="icon" href="/admin/jadwal-praktikum/{schedule.id}/edit">
										<Edit class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="text-destructive hover:bg-destructive/10 hover:text-destructive"
										onclick={() => confirmDelete(schedule.id)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="h-24 text-center">
								Belum ada jadwal kegiatan.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
