<script lang="ts">
	import './layout.css';
	import { pwaInfo } from 'virtual:pwa-info';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';
	import NavProgress from '@/components/NavProgress.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { ToastProvider } from '$lib/components/toast';

	let { children } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({
				immediate: true,
				onRegistered(r) {
					console.log(`SW Registered: ${r}`);
				},
				onRegisterError(error: any) {
					console.log('SW registration error', error);
				}
			});
		}
	});
</script>

<Toaster />
<ToastProvider />

<svelte:head>
	<link rel="icon" href={favicon} />
	{@html webManifestLink}
</svelte:head>

<NavProgress />
{@render children()}
