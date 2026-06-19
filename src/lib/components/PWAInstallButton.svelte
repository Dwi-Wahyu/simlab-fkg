<script lang="ts">
	import { onMount } from 'svelte';
	import { Download } from '@lucide/svelte';

	let deferredPrompt = $state<any>(null);
	let canInstall = $state(false);

	onMount(() => {
		const handler = (e: any) => {
			// Prevent Chrome 67 and earlier from automatically showing the prompt
			e.preventDefault();
			// Stash the event so it can be triggered later.
			deferredPrompt = e;
			canInstall = true;
		};

		window.addEventListener('beforeinstallprompt', handler);

		// Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			canInstall = false;
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handler);
		};
	});

	async function handleInstall() {
		if (!deferredPrompt) return;

		// Show the prompt
		deferredPrompt.prompt();

		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;
		console.log(`User response to the install prompt: ${outcome}`);

		// We've used the prompt, and can't use it again, throw it away
		deferredPrompt = null;
		canInstall = false;
	}
</script>

{#if canInstall}
	<button
		onclick={handleInstall}
		class="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20"
		title="Download App"
	>
		<Download size={18} />
		<span class="hidden sm:inline">Install</span>
	</button>
{/if}
