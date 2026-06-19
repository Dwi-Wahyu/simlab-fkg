<script lang="ts">
	import {
		Activity,
		Clipboard,
		ClipboardList,
		FlaskConical,
		GraduationCap,
		History,
		LayoutDashboard,
		Package,
		Settings,
		ShieldCheck,
		UserCog,
		Wrench,
		X
	} from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { IsMobile } from '$lib/hooks/is-mobile-svelte';
	import SidebarDropdown from './SidebarDropdown.svelte';
	import SidebarLink from './SidebarLink.svelte';
	import { getSidebarState } from './ui/sidebar/context.svelte';

	const { user } = $props();
	const sidebar = getSidebarState();
	const isMobile = new IsMobile();

	let openDropdown = $state<string | null>(null);

	function hasRole(menuRole: string | string[] | undefined, userRole: string) {
		if (!menuRole || (Array.isArray(menuRole) && menuRole.length === 0)) return true;
		if (Array.isArray(menuRole)) return menuRole.includes(userRole);
		return menuRole === userRole;
	}

	const rawMenus = $derived([
		{
			name: 'Dashboard',
			path: `/admin/dashboard`,
			icon: LayoutDashboard,
			isDropdown: false,
			role: [],
			children: []
		},
		{
			name: 'Akademik',
			path: `/admin/akademik`,
			icon: GraduationCap,
			isDropdown: true,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'admin'],
			children: [
				{
					name: 'Jadwal & Reservasi',
					path: `/admin/jadwal-praktikum`,
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Praktikum',
					path: `/admin/master/seri`,
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Penilaian',
					path: `/admin/penilaian`,
					role: ['superadmin', 'koordinator']
				},
				{
					name: 'Modul & Materi',
					path: `/admin/master/modul`,
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Logbook Digital',
					path: `/admin/logbook`,
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Daftar Mahasiswa',
					path: `/admin/users/mahasiswa`,
					role: ['superadmin', 'koordinator', 'kepalaLab', 'admin']
				}
			]
		},

		{
			name: 'Penilaian',
			icon: Clipboard,
			isDropdown: false,
			path: `/admin/penilaian`,
			role: ['instruktur']
		},

		{
			name: 'Daftar Mahasiswa',
			path: `/admin/users/mahasiswa`,
			icon: GraduationCap,
			isDropdown: false,
			role: ['instruktur'],
			children: []
		},

		{
			name: 'Riwayat Praktikum',
			path: `/admin/riwayat-praktikum`,
			icon: History,
			isDropdown: false,
			role: ['peneliti'],
			children: []
		},
		{
			name: 'Logbook Praktikum',
			path: `/admin/logbook-saya`,
			icon: ClipboardList,
			isDropdown: false,
			role: ['peneliti'],
			children: []
		},
		{
			name: 'Inventaris',
			path: `/admin/inventaris`,
			icon: Package,
			isDropdown: true,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'teknisi'],
			children: [
				{
					name: 'Alat',
					path: `/admin/inventaris/alat`,
					role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'teknisi']
				},
				{
					name: 'Bahan Habis Pakai',
					path: `/admin/inventaris/bhp`,
					role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'teknisi']
				}
			]
		},
		{
			name: 'Peminjaman',
			path: `/admin/peminjaman`,
			icon: ClipboardList,
			isDropdown: false,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'peneliti', 'instruktur'],
			children: []
		},
		{
			name: 'Pemeliharaan & Kalibrasi',
			path: `/admin/pemeliharaan`,
			icon: Wrench,
			isDropdown: false,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'teknisi'],
			children: []
		},
		{
			name: 'Limbah & K3',
			path: `/admin/limbah-k3`,
			icon: Activity,
			isDropdown: false,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'spmi'],
			children: []
		},
		{
			name: 'Quality & Audit',
			path: `/admin/audit`,
			icon: ShieldCheck,
			isDropdown: false,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'spmi'],
			children: []
		}
	]);

	const systemMenus = $derived([
		{
			name: 'Manajemen Lab',
			path: `/admin/laboratorium`,
			icon: FlaskConical,
			isDropdown: false,
			role: ['superadmin'],
			children: []
		},
		{
			name: 'Manajemen User',
			path: `/admin/users`,
			icon: UserCog,
			isDropdown: true,
			role: ['superadmin'],
			children: [
				{
					name: 'Koordinator',
					path: `/admin/users/koordinator`,
					role: ['superadmin']
				},
				{
					name: 'Kepala Lab',
					path: `/admin/users/kepala-lab`,
					role: ['superadmin']
				},
				{
					name: 'Instruktur',
					path: `/admin/users/instruktur`,
					role: ['superadmin']
				},
				{
					name: 'Teknisi',
					path: `/admin/users/teknisi`,
					role: ['superadmin']
				},
				{
					name: 'SPMI',
					path: `/admin/users/spmi`,
					role: ['superadmin']
				}
			]
		},
		{
			name: 'Audit Log Sistem',
			path: `/admin/audit-log`,
			icon: History,
			isDropdown: false,
			role: ['superadmin', 'kakomlek'],
			children: []
		},
		{
			name: 'Pengaturan Master',
			path: `/admin/pengaturan`,
			icon: Settings,
			isDropdown: true,
			role: ['superadmin', 'kepalaLab'],
			children: [
				{
					name: 'Blok Praktikum',
					path: `/admin/master/blok`,
					role: ['superadmin']
				},
				{
					name: 'Departemen',
					path: `/admin/master/departemen`,
					role: ['superadmin']
				}
			]
		}
	]);

	const menus = $derived(
		rawMenus
			.filter((menu) => hasRole(menu.role, user.role))
			.map((menu) => {
				if (menu.isDropdown) {
					const filteredChildren = menu.children.filter((child) => hasRole(child.role, user.role));
					return { ...menu, children: filteredChildren };
				}
				return menu;
			})
			.filter((menu) => !menu.isDropdown || menu.children.length > 0)
	);

	const sMenus = $derived(systemMenus.filter((menu) => hasRole(menu.role, user.role)));

	function handleDropdownToggle(name: string) {
		if (!sidebar.open) {
			sidebar.setOpen(true);
			openDropdown = name;
		} else {
			openDropdown = openDropdown === name ? null : name;
		}
	}

	// Auto-open active dropdown
	$effect(() => {
		if (sidebar.open) {
			const activeMenu = [...menus, ...sMenus].find(
				(m) => m.isDropdown && page.url.pathname.startsWith(m.path)
			);
			if (activeMenu && openDropdown === null) {
				openDropdown = activeMenu.name;
			}
		} else {
			openDropdown = null;
		}
	});

	// Auto-close sidebar on mobile when navigating (pathname changes)
	$effect(() => {
		void page.url.pathname;
		untrack(() => {
			if (isMobile.current && sidebar.open) {
				sidebar.setOpen(false);
			}
		});
	});
</script>

<!-- Backdrop Overlay (Hanya muncul di Mobile saat Sidebar terbuka) -->
{#if isMobile.current && sidebar.open}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
		onclick={() => sidebar.setOpen(false)}
		transition:fade={{ duration: 200 }}
		aria-label="Close sidebar"
	></button>
{/if}

<aside
	class="sidebar-mobile-base fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden bg-[#2D5A43] text-white
    shadow-xl transition-all duration-300 ease-in-out md:relative md:border-r md:border-white/5
    {sidebar.open
		? 'sidebar-mobile-open w-[260px] translate-x-0 shadow-2xl md:shadow-none'
		: 'w-0 -translate-x-full md:w-[70px] md:translate-x-0'}
    "
>
	<div
		class="flex items-center justify-between p-6 transition-all duration-300 {sidebar.open
			? ''
			: 'md:px-4'}"
	>
		<div class="flex items-center {sidebar.open ? 'gap-3' : 'w-full justify-center'}">
			<div
				class="flex shrink-0 items-center justify-center rounded-lg transition-all duration-300 {sidebar.open
					? 'h-10 w-10'
					: 'h-10 w-10 md:h-9 md:w-9'}"
			>
				<img src="/logo-unhas.webp" alt="Logo" class="h-full w-full object-contain" />
			</div>

			{#if sidebar.open || isMobile.current}
				<div
					class="transition-opacity duration-300"
					class:opacity-0={!sidebar.open && !isMobile.current}
					class:pointer-events-none={!sidebar.open && !isMobile.current}
				>
					<h1 class="text-lg leading-tight font-bold tracking-wider whitespace-nowrap">SIM-Lab</h1>
					<p class="text-[10px] font-medium tracking-wider whitespace-nowrap uppercase opacity-80">
						Lab FKG
					</p>
				</div>
			{/if}
		</div>

		{#if isMobile.current && sidebar.open}
			<button
				type="button"
				class="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
				onclick={() => sidebar.setOpen(false)}
			>
				<X size={20} />
			</button>
		{/if}
	</div>

	<nav class="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-10">
		<div
			class="mb-4 px-2 text-[11px] font-semibold tracking-wider text-white/50 uppercase transition-opacity"
			class:opacity-0={!sidebar.open && !isMobile.current}
		>
			Menu Utama
		</div>
		<ul class="space-y-1">
			{#each menus as menu (menu.name)}
				{#if menu.isDropdown}
					<SidebarDropdown
						name={sidebar.open || isMobile.current ? menu.name : ''}
						icon={menu.icon}
						activePrefix={menu.path}
						children={menu.children}
						isOpen={openDropdown === menu.name}
						onToggle={() => handleDropdownToggle(menu.name)}
					/>
				{:else}
					<SidebarLink
						href={menu.path}
						icon={menu.icon}
						name={sidebar.open || isMobile.current ? menu.name : ''}
					/>
				{/if}
			{/each}
		</ul>

		{#if ['superadmin', 'kakomlek'].includes(user.role)}
			<div
				class="mt-8 mb-4 px-2 text-[11px] font-semibold tracking-wider text-white/50 uppercase transition-opacity"
				class:opacity-0={!sidebar.open && !isMobile.current}
			>
				Sistem
			</div>
			<ul class="space-y-1">
				{#each sMenus as menu (menu.name)}
					{#if menu.isDropdown}
						<SidebarDropdown
							name={sidebar.open || isMobile.current ? menu.name : ''}
							icon={menu.icon}
							activePrefix={menu.path}
							children={menu.children}
							isOpen={openDropdown === menu.name}
							onToggle={() => handleDropdownToggle(menu.name)}
						/>
					{:else}
						<SidebarLink
							href={menu.path}
							icon={menu.icon}
							name={sidebar.open || isMobile.current ? menu.name : ''}
						/>
					{/if}
				{/each}
			</ul>
		{/if}
	</nav>

	<!-- Visual Decoration at Bottom (Background) -->
	<div
		class="pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden transition-opacity duration-500"
		class:opacity-0={!sidebar.open && !isMobile.current}
	>
		<img
			src="/alat-gigi.png"
			alt="Alat Gigi"
			class="h-auto w-full translate-y-4 scale-110 opacity-15 mix-blend-overlay grayscale transition-all duration-700"
		/>
	</div>
</aside>

<style>
	/* Memastikan di mobile sidebar tertutup secara default saat SSR */
	@media (max-width: 767px) {
		:global(.sidebar-mobile-base) {
			width: 0 !important;
			transform: translateX(-100%) !important;
		}
		:global(.sidebar-mobile-open) {
			width: 260px !important;
			transform: translateX(0) !important;
		}
	}
</style>
