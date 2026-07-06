<script lang="ts">
	// Dashboard components
	import SuperadminDashboard from '$lib/components/dashboard/SuperadminDashboard.svelte';
	import KoordinatorDashboard from '$lib/components/dashboard/KoordinatorDashboard.svelte';
	import KepalaLabDashboard from '$lib/components/dashboard/KepalaLabDashboard.svelte';
	import InstrukturDashboard from '$lib/components/dashboard/InstrukturDashboard.svelte';
	import PenelitiDashboard from '$lib/components/dashboard/PenelitiDashboard.svelte';
	import TeknisiDashboard from '$lib/components/dashboard/TeknisiDashboard.svelte';
	import SpmiDashboard from '$lib/components/dashboard/SpmiDashboard.svelte';

	// Skeleton components
	import SuperadminSkeleton from '$lib/components/dashboard/skeletons/SuperadminSkeleton.svelte';
	import KoordinatorSkeleton from '$lib/components/dashboard/skeletons/KoordinatorSkeleton.svelte';
	import KepalaLabSkeleton from '$lib/components/dashboard/skeletons/KepalaLabSkeleton.svelte';
	import InstrukturSkeleton from '$lib/components/dashboard/skeletons/InstrukturSkeleton.svelte';
	import PenelitiSkeleton from '$lib/components/dashboard/skeletons/PenelitiSkeleton.svelte';
	import TeknisiSkeleton from '$lib/components/dashboard/skeletons/TeknisiSkeleton.svelte';
	import SpmiSkeleton from '$lib/components/dashboard/skeletons/SpmiSkeleton.svelte';

	let { data } = $props();
	const role = $derived(data.role);

	const roleLabels: Record<string, string> = {
		superadmin: 'Super Admin',
		koordinator: 'PJ Mata Kuliah',
		kepalaLab: 'Kepala Laboratorium',
		instruktur: 'DPJP / Dosen',
		peneliti: 'Mahasiswa',
		teknisi: 'Teknisi',
		spmi: 'SPMI'
	};
</script>

<svelte:head>
	<title>Dashboard — {roleLabels[role] ?? role}</title>
</svelte:head>

<div class="space-y-4 p-6">
	{#await data.dashboardPromise}
		<!-- Skeleton sesuai role -->
		{#if role === 'superadmin'}
			<SuperadminSkeleton />
		{:else if role === 'koordinator'}
			<KoordinatorSkeleton />
		{:else if role === 'kepalaLab'}
			<KepalaLabSkeleton />
		{:else if role === 'instruktur'}
			<InstrukturSkeleton />
		{:else if role === 'peneliti'}
			<PenelitiSkeleton />
		{:else if role === 'teknisi'}
			<TeknisiSkeleton />
		{:else if role === 'spmi'}
			<SpmiSkeleton />
		{/if}
	{:then dashboardData}
		<!-- Dashboard aktual sesuai role -->
		{#if dashboardData.role === 'superadmin'}
			<SuperadminDashboard data={dashboardData.data} />
		{:else if dashboardData.role === 'koordinator'}
			<KoordinatorDashboard data={dashboardData.data} />
		{:else if dashboardData.role === 'kepalaLab'}
			<KepalaLabDashboard data={dashboardData.data} />
		{:else if dashboardData.role === 'instruktur'}
			<InstrukturDashboard data={dashboardData.data} />
		{:else if dashboardData.role === 'peneliti'}
			<PenelitiDashboard data={dashboardData.data} />
		{:else if dashboardData.role === 'teknisi'}
			<TeknisiDashboard data={dashboardData.data} />
		{:else if dashboardData.role === 'spmi'}
			<SpmiDashboard data={dashboardData.data} />
		{/if}
	{:catch err}
		<div class="rounded-md border border-destructive p-4 text-sm text-destructive">
			Gagal memuat dashboard: {err.message}
		</div>
	{/await}
</div>
