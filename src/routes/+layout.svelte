<script lang="ts">
	import './layout.css';
	import { pwaInfo } from 'virtual:pwa-info';
	import { onMount } from 'svelte';
	import { Toaster } from 'svelte-sonner';
	import NavProgress from '@/components/NavProgress.svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { ToastProvider } from '$lib/components/toast';
	import { page } from '$app/stores';

	let { children } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
	let ogImageUrl = $derived($page.url.origin + '/og-image.png');

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

	<!-- Primary Meta Tags -->
	<meta name="title" content="Simlab FKG" />
	<meta
		name="description"
		content="Sistem Informasi Manajemen Laboratorium Fakultas Kedokteran Gigi"
	/>
	<meta name="keywords" content="simlab, fkg, laboratorium, kedokteran gigi, sistem informasi" />
	<meta name="author" content="Dwi Wahyu Ilahi Angka" />
	<meta name="robots" content="index, follow" />
	<meta name="theme-color" content="#ffffff" />

	<!-- Open Graph / Facebook / WhatsApp / LinkedIn -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={$page.url.href} />
	<meta property="og:title" content="Simlab FKG" />
	<meta
		property="og:description"
		content="Sistem Informasi Manajemen Laboratorium Fakultas Kedokteran Gigi"
	/>
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Simlab FKG" />
	<meta
		name="twitter:description"
		content="Sistem Informasi Manajemen Laboratorium Fakultas Kedokteran Gigi"
	/>
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<NavProgress />
{@render children()}
