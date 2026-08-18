<script lang="ts">
	import PeminjamPage from '$lib/components/peminjaman/PeminjamPage.svelte';
	import LabUserPage from '$lib/components/peminjaman/LabUserPage.svelte';

	let {
		data
	}: {
		data: {
			user: any;
			notifications: any[];
			unreadCount: number;
			lendingsPromise: Promise<any[]>;
		};
	} = $props();
</script>

{#if data.user?.role === 'mahasiswa' || data.user?.role === 'dosen'}
	<PeminjamPage {data} />
{:else}
	<LabUserPage {data} />
{/if}
