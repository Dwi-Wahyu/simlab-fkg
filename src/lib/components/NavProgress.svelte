<!-- src/lib/components/nav-progress.svelte -->
<script lang="ts">
	import { navigating } from '$app/state';

	let visible = $state(false);
	let width = $state(0);
	let fading = $state(false);
	let startTimeout: ReturnType<typeof setTimeout>;
	let fadeTimeout: ReturnType<typeof setTimeout>;
	let hideTimeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (navigating.to) {
			// starting a new navigation — cancel any pending hide/fade
			clearTimeout(startTimeout);
			clearTimeout(fadeTimeout);
			clearTimeout(hideTimeout);

			fading = false;
			visible = true;
			width = 20;
			startTimeout = setTimeout(() => (width = 70), 150);
		} else if (visible) {
			// finished — snap to 100%, then fade (never shrink width)
			width = 100;

			fadeTimeout = setTimeout(() => {
				fading = true; // triggers opacity transition only
			}, 150);

			hideTimeout = setTimeout(() => {
				visible = false;
				fading = false;
				width = 0; // safe to reset now, element is gone
			}, 350); // 150ms hold + 200ms fade
		}
	});
</script>

{#if visible}
	<div class="fixed top-0 left-0 z-[100] h-[3px] w-full bg-transparent">
		<div
			class="h-full bg-primary transition-[width] duration-300 ease-out"
			class:pulse={!fading}
			class:opacity-transition={fading}
			style="width: {width}%; opacity: {fading ? 0 : 1}"
		></div>
	</div>
{/if}

<style>
	.opacity-transition {
		transition: opacity 200ms ease-out;
	}
	.pulse {
		animation: pulse 1.5s infinite ease-in-out;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
