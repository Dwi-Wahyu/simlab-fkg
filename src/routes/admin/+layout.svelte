<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */

	import { Bell, LogOut, PanelLeft, Settings, User } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import PWAInstallButton from '$lib/components/PWAInstallButton.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { setSidebarState } from '$lib/components/ui/sidebar/context.svelte.js';

	let { data, children } = $props();

	const userImage = $derived(
		data.user?.image
			? data.user.image.startsWith('http://') ||
				data.user.image.startsWith('https://') ||
				data.user.image.startsWith('/')
				? data.user.image
				: `/uploads/profiles/${data.user.image}`
			: ''
	);

	const sidebar = setSidebarState(false); // SSR default: tutup (aman untuk mobile)

	let isLogoutDialogOpen = $state(false);

	const toTitleCase = (str: string) => {
		if (!str) return '';
		return str
			.toLowerCase()
			.split('_')
			.join(' ')
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const initials = $derived(
		data.user.name
			? data.user.name
					.split(' ')
					.map((n: string) => n[0])
					.join('')
					.toUpperCase()
					.slice(0, 2)
			: '??'
	);

	const roleLabelMap: Record<string, string> = {
		instruktur: 'DPJP',
		koordinator: 'PJ Mata Kuliah',
		peneliti: 'Mahasiswa'
	};

	const roleLabel = $derived(roleLabelMap[data.user.role] ?? toTitleCase(data.user.role));

	// Get page title from URL or data
	const pageTitle = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes('/inventaris/alat')) return 'Inventaris Alat';
		if (path.includes('/inventaris/bhp')) return 'Inventaris Bahan Habis Pakai';
		if (path.includes('/alat') || path.includes('/inventori')) return 'Inventaris';
		if (path.includes('/dashboard')) return 'Dashboard';
		if (path.includes('/jadwal')) return 'Jadwal & Reservasi';
		if (path.includes('/peminjaman')) return 'Peminjaman';
		if (path.includes('/logbook')) return 'Logbook Digital';
		if (path.includes('/pemeliharaan')) return 'Pemeliharaan';
		if (path.includes('/limbah')) return 'Limbah & K3';
		if (path.includes('/laporan')) return 'Laporan';
		if (path.includes('/audit')) return 'Quality & Audit';
		if (path.includes('/nilai')) return 'Rekapitulasi Nilai';
		if (path.includes('/users')) return 'Manajemen Mahasiswa';
		if (path.includes('/pengaturan')) return 'Pengaturan';
		return 'SIM-Lab';
	});

	function handleLogout() {
		goto(`/logout`);
	}

	onMount(() => {
		if (window.innerWidth >= 768) {
			sidebar.setOpen(true); // Desktop: buka setelah hydration
		}
	});
</script>

<div class="flex h-screen bg-[#F8F9FA]">
	<Sidebar user={data.user} />

	<main class="flex-1 overflow-y-auto">
		<header
			class="sticky top-0 z-10 flex h-16 items-center justify-between bg-white px-4 shadow-sm transition-all duration-300 md:px-8"
		>
			<div class="flex items-center gap-4 md:gap-6">
				<button
					onclick={() => sidebar.toggle()}
					class="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100"
					title="Toggle Sidebar"
				>
					<PanelLeft />
				</button>

				<!-- <div class="flex flex-col">
					<h1 class="hidden text-lg font-bold text-slate-800 md:block">{pageTitle}</h1>
				</div> -->
			</div>

			<div class="flex items-center gap-2 md:gap-6">
				<!-- Tampilan Desktop (Sembunyi di Mobile) -->
				<div class="hidden items-center gap-6 md:flex">
					<PWAInstallButton />

					<NotificationBell
						notifications={data.notifications}
						unreadCount={data.unreadCount}
						organizationId={data.user.laboratorium?.id}
					/>

					<div class="h-8 w-px bg-slate-200"></div>

					<a
						href="/admin/profil"
						class="group flex items-center gap-3 transition-opacity hover:opacity-90"
					>
						<Avatar
							src={userImage}
							alt={data.user.name}
							{initials}
							class="h-9 w-9 border-2 border-primary/10 transition-transform group-hover:scale-105"
						/>
						<div class="flex flex-col">
							<span
								class="text-sm font-bold text-slate-700 transition-colors group-hover:text-primary"
								>{data.user.name}</span
							>
							<span class="text-[11px] font-medium text-slate-400">
								{roleLabel}
							</span>
						</div>
					</a>

					<button
						onclick={() => (isLogoutDialogOpen = true)}
						title="Logout"
						class="ml-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-destructive"
					>
						<LogOut size={20} />
					</button>
				</div>

				<!-- Tampilan Mobile (Sembunyi di Desktop) -->
				<div class="flex items-center gap-3 md:hidden">
					<PWAInstallButton />

					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="rounded-full ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<Avatar
								src={userImage}
								alt={data.user.name}
								{initials}
								class="h-9 w-9 border-2 border-primary/10"
							/>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-64 p-1.5">
							<DropdownMenu.Label class="p-3 font-normal">
								<div class="flex flex-col space-y-1">
									<p class="text-sm leading-none font-semibold">{data.user.name}</p>
									<p class="text-xs leading-none text-muted-foreground">
										{roleLabel}
									</p>
								</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<a
									href="/admin/profil"
									class="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors outline-none hover:bg-slate-100 focus:bg-slate-100"
								>
									<User class="size-5 text-slate-500" />
									<span>Profil Saya</span>
								</a>
								<a
									href="/admin/notifikasi"
									class="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors outline-none hover:bg-slate-100 focus:bg-slate-100"
								>
									<Bell class="size-5 text-slate-500" />
									<span>Notifikasi</span>
									{#if data.unreadCount > 0}
										<span
											class="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
										>
											{data.unreadCount}
										</span>
									{/if}
								</a>
								<a
									href="/admin/pengaturan"
									class="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors outline-none hover:bg-slate-100 focus:bg-slate-100"
								>
									<Settings class="size-5 text-slate-500" />
									<span>Pengaturan</span>
								</a>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onclick={() => (isLogoutDialogOpen = true)}
								class="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
							>
								<LogOut class="size-5" />
								<span>Keluar Sistem</span>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>
		</header>

		<div>
			{@render children()}
		</div>
	</main>
</div>

<ConfirmationDialog
	bind:open={isLogoutDialogOpen}
	type="info"
	title="Konfirmasi Keluar"
	description="Apakah Anda yakin ingin keluar dari sistem? Anda akan diminta login kembali untuk mengakses data."
	actionLabel="Keluar"
	cancelLabel="Batal"
	onAction={handleLogout}
/>
