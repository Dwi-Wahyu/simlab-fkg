<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { LogOut, Menu } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { goto } from '$app/navigation';
	import { setSidebarState } from '@/components/ui/sidebar/context.svelte.js';

	let { data, children } = $props();
	const sidebar = setSidebarState();

	let isLogoutDialogOpen = $state(false);

	const toTitleCase = (str: string) => {
		return str
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const orgName = $derived(data.user.organization.name ?? '');

	function handleLogout() {
		goto('/logout');
	}
</script>

<div class="flex h-screen bg-[#F8F9FA]">
	<Sidebar user={data.user} />

	<main class="flex-1 overflow-y-auto">
		<header
			class="flex h-16 items-center justify-between bg-white/50 px-8 shadow transition-all duration-300"
		>
			<div class="flex items-center gap-4">
				<button
					onclick={() => sidebar.toggle()}
					class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
					title="Toggle Sidebar"
				>
					<Menu size={20} />
				</button>
				<h1>{toTitleCase(orgName)}</h1>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="/{data.user.organization.slug}/profil"
					class="flex items-center gap-3 transition-colors hover:text-primary"
				>
					<h4 class="rounded-full text-sm text-gray-800">
						{data.user.name}
					</h4>
					<Avatar.Root>
						<Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" />
						<Avatar.Fallback>CN</Avatar.Fallback>
					</Avatar.Root>
				</a>

				<button
					onclick={() => (isLogoutDialogOpen = true)}
					title="Logout"
					class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-destructive"
				>
					<LogOut size={20} />
				</button>

				<NotificationBell
					notifications={data.notifications}
					unreadCount={data.unreadCount}
					organizationId={data.user.organization.id}
				/>
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
