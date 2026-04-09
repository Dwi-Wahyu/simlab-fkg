<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { LogOut, PanelLeft, Bell, User, Settings } from '@lucide/svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { IsMobile } from '$lib/hooks/is-mobile-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { base } from '$app/paths';
	import { setSidebarState } from '$lib/components/ui/sidebar/context.svelte.js';

	let { data, children } = $props();
	const sidebar = setSidebarState();
	const isMobile = new IsMobile();

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

	const orgName = $derived(data.user.laboratorium?.name ?? '');
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

	// Get page title from URL or data
	const pageTitle = $derived.by(() => {
		const path = page.url.pathname;
		if (path.includes('/alat')) return 'Inventori';
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
		goto(`${base}/logout`);
	}
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

				<div class="flex flex-col">
					<h1 class="hidden text-lg font-bold text-slate-800 md:block">{pageTitle}</h1>
				</div>
			</div>

			<div class="flex items-center gap-2 md:gap-6">
				<!-- Tampilan Desktop (Sembunyi di Mobile) -->
				<div class="hidden items-center gap-6 md:flex">
					<NotificationBell
						notifications={data.notifications}
						unreadCount={data.unreadCount}
						organizationId={data.user.laboratorium?.id}
					/>

					<div class="h-8 w-px bg-slate-200"></div>

					<div class="flex items-center gap-3">
						<Avatar
							src={data.user.image}
							alt={data.user.name}
							{initials}
							class="h-9 w-9 border-2 border-primary/10"
						/>
						<div class="flex flex-col">
							<span class="text-sm font-bold text-slate-700">{data.user.name}</span>
							<span class="text-[11px] font-medium text-slate-400">
								{toTitleCase(data.user.role)}
							</span>
						</div>
					</div>

					<button
						onclick={() => (isLogoutDialogOpen = true)}
						title="Logout"
						class="ml-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-destructive"
					>
						<LogOut size={20} />
					</button>
				</div>

				<!-- Tampilan Mobile (Sembunyi di Desktop) -->
				<div class="md:hidden">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="rounded-full ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							<Avatar
								src={data.user.image}
								alt={data.user.name}
								{initials}
								class="h-9 w-9 border-2 border-primary/10"
							/>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-56">
							<DropdownMenu.Label class="font-normal">
								<div class="flex flex-col space-y-1">
									<p class="text-sm leading-none font-medium">{data.user.name}</p>
									<p class="text-xs leading-none text-muted-foreground">
										{toTitleCase(data.user.role)}
									</p>
								</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Item href="{base}/admin/profil">
									<User class="mr-2 h-4 w-4" />
									<span>Profil Saya</span>
								</DropdownMenu.Item>
								<DropdownMenu.Item href="{base}/admin/notifikasi">
									<Bell class="mr-2 h-4 w-4" />
									<span>Notifikasi</span>
									{#if data.unreadCount > 0}
										<span
											class="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
										>
											{data.unreadCount}
										</span>
									{/if}
								</DropdownMenu.Item>
								<DropdownMenu.Item href="{base}/admin/pengaturan">
									<Settings class="mr-2 h-4 w-4" />
									<span>Pengaturan</span>
								</DropdownMenu.Item>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onclick={() => (isLogoutDialogOpen = true)}
								class="text-destructive focus:bg-destructive/10 focus:text-destructive"
							>
								<LogOut class="mr-2 h-4 w-4" />
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
