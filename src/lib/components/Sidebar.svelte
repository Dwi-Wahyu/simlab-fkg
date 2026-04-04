<script lang="ts">
	import {
		LayoutDashboard,
		Calendar,
		Package,
		Repeat,
		BookOpen,
		Wrench,
		Recycle,
		FileText,
		ShieldCheck,
		ClipboardList,
		GraduationCap,
		Settings,
		Leaf,
		FlaskConical,
		Book,
		UserCog,
		X,
		History
	} from '@lucide/svelte';
	import SidebarDropdown from './SidebarDropdown.svelte';
	import SidebarLink from './SidebarLink.svelte';
	import { getSidebarState } from './ui/sidebar/context.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile-svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';

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
			path: '/admin/dashboard',
			icon: LayoutDashboard,
			isDropdown: false,
			role: [],
			children: []
		},
		{
			name: 'Akademik',
			path: '/admin/akademik',
			icon: GraduationCap,
			isDropdown: true,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'instruktur', 'admin'],
			children: [
				{
					name: 'Jadwal & Reservasi',
					path: '/admin/jadwal-praktikum',
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Seri Praktikum',
					path: '/admin/master/seri',
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Penilaian',
					path: '/admin/penilaian',
					role: ['instruktur', 'superadmin', 'koordinator']
				},
				{
					name: 'Modul & Materi',
					path: '/admin/master/modul',
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Logbook Digital',
					path: '/admin/logbook',
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Daftar Mahasiswa',
					path: '/admin/users/mahasiswa',
					role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'instruktur']
				}
			]
		},
		{
			name: 'Sarpras & Inventori',
			path: '/admin/sarpras',
			icon: Package,
			isDropdown: true,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'teknisi'],
			children: [
				{
					name: 'Inventori',
					path: '/admin/inventori',
					role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'teknisi']
				},
				{
					name: 'Peminjaman',
					path: '/admin/peminjaman',
					role: ['superadmin', 'koordinator', 'kepalaLab']
				},
				{
					name: 'Pemeliharaan & Kalibrasi',
					path: '/admin/pemeliharaan',
					role: ['superadmin', 'koordinator', 'kepalaLab', 'teknisi']
				}
			]
		},
		{
			name: 'Kualitas & K3',
			path: '/admin/kualitas',
			icon: ShieldCheck,
			isDropdown: true,
			role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'spmi'],
			children: [
				{
					name: 'Limbah & K3',
					path: '/admin/limbah-k3',
					role: ['superadmin', 'koordinator', 'kepalaLab', 'admin', 'spmi']
				},
				{
					name: 'Quality & Audit',
					path: '/admin/audit',
					role: ['superadmin', 'koordinator', 'kepalaLab', 'spmi']
				}
			]
		}
	]);

	const systemMenus = $derived([
		{
			name: 'Manajemen Lab',
			path: '/admin/laboratorium',
			icon: FlaskConical,
			isDropdown: false,
			role: ['superadmin'],
			children: []
		},
		{
			name: 'Manajemen User',
			path: '/admin/users',
			icon: UserCog,
			isDropdown: true,
			role: ['superadmin'],
			children: [
				{
					name: 'Koordinator',
					path: '/admin/users/koordinator',
					role: ['superadmin']
				},
				{
					name: 'Kepala Lab',
					path: '/admin/users/kepala-lab',
					role: ['superadmin']
				},
				{
					name: 'Instruktur',
					path: '/admin/users/instruktur',
					role: ['superadmin']
				},
				{
					name: 'Teknisi',
					path: '/admin/users/teknisi',
					role: ['superadmin']
				},
				{
					name: 'SPMI',
					path: '/admin/users/spmi',
					role: ['superadmin']
				}
			]
		},
		{
			name: 'Audit Log Sistem',
			path: '/admin/audit-log',
			icon: History,
			isDropdown: false,
			role: ['superadmin', 'kakomlek'],
			children: []
		},
		{
			name: 'Pengaturan Master',
			path: '/admin/pengaturan',
			icon: Settings,
			isDropdown: true,
			role: ['superadmin', 'kepalaLab'],
			children: [
				{
					name: 'Blok Praktikum',
					path: '/admin/master/blok',
					role: ['superadmin']
				},
				{
					name: 'Departemen',
					path: '/admin/master/departemen',
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

	// Tutup sidebar secara otomatis saat pertama kali dimuat di mobile
	$effect(() => {
		if (isMobile.current) {
			sidebar.setOpen(false);
		}
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
	class="flex h-screen flex-col overflow-hidden bg-[#2D5A43] text-white shadow-xl transition-all duration-300 ease-in-out
    {isMobile.current
		? 'fixed inset-y-0 left-0 z-50 shadow-2xl'
		: 'relative border-r border-white/5'}
    "
	style="width: {isMobile.current
		? sidebar.open
			? '260px'
			: '0px'
		: sidebar.open
			? '256px'
			: '70px'};
           transform: translateX({isMobile.current && !sidebar.open ? '-100%' : '0'});"
>
	<div class="flex items-center justify-between p-6">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
				<img src="/logo-unhas.webp" alt="Logo" class="h-full w-full object-contain" />
			</div>

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
</aside>
