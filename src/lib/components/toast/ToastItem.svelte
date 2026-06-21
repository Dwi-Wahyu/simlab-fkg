<script lang="ts">
	import { toast, type ToastItem } from './toast.svelte';
	import { fly } from 'svelte/transition';
	import { X } from '@lucide/svelte';

	interface Props {
		toastItem: ToastItem;
	}

	let { toastItem }: Props = $props();

	// Determine transition direction based on position
	function getTransition(position: string) {
		if (position.includes('left')) return { x: -300, duration: 300 };
		if (position.includes('right')) return { x: 300, duration: 300 };
		if (position === 'top-center') return { y: -300, duration: 300 };
		if (position === 'bottom-center') return { y: 300, duration: 300 };
		return { y: 300, duration: 300 };
	}

	// State configurations
	const stateConfig = {
		success: {
			icon: '/icons/success-icon-toast.svg',
			borderColor: 'border-emerald-500/30 dark:border-emerald-500/20',
			bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/20',
			textColor: 'text-emerald-800 dark:text-emerald-300',
			progressColor: 'bg-emerald-500 dark:bg-emerald-600',
			accentBg: 'bg-emerald-500/10'
		},
		info: {
			icon: '/icons/info-icon-toast.svg',
			borderColor: 'border-blue-500/30 dark:border-blue-500/20',
			bgColor: 'bg-blue-50/70 dark:bg-blue-950/20',
			textColor: 'text-blue-800 dark:text-blue-300',
			progressColor: 'bg-blue-500 dark:bg-blue-600',
			accentBg: 'bg-blue-500/10'
		},
		warning: {
			icon: '/icons/warning-icon-toast.svg',
			borderColor: 'border-amber-500/30 dark:border-amber-500/20',
			bgColor: 'bg-amber-50/70 dark:bg-amber-950/20',
			textColor: 'text-amber-800 dark:text-amber-300',
			progressColor: 'bg-amber-500 dark:bg-amber-600',
			accentBg: 'bg-amber-500/10'
		},
		destructive: {
			icon: '/icons/danger-icon-toast.svg',
			borderColor: 'border-rose-500/30 dark:border-rose-500/20',
			bgColor: 'bg-rose-50/70 dark:bg-rose-950/20',
			textColor: 'text-rose-800 dark:text-rose-300',
			progressColor: 'bg-rose-500 dark:bg-rose-600',
			accentBg: 'bg-rose-500/10'
		}
	};

	const config = $derived(stateConfig[toastItem.type]);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	transition:fly={getTransition(toastItem.position)}
	onmouseenter={() => toast.pause(toastItem.position, toastItem.id)}
	onmouseleave={() => toast.resume(toastItem.position, toastItem.id)}
	class="relative flex w-full sm:max-w-md overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl dark:border-zinc-800/80 dark:bg-zinc-950/95 dark:shadow-none"
	style="min-height: 80px;"
>
	<!-- Toast Content Layout -->
	<div class="flex w-full items-start gap-4 pr-6">
		<!-- Icon Container -->
		<div class="flex-shrink-0 select-none">
			<img src={config.icon} alt={toastItem.type} class="h-10 w-10 object-contain" />
		</div>

		<!-- Title & Description -->
		<div class="flex-grow space-y-0.5">
			<h4 class="text-sm leading-tight font-semibold text-zinc-900 dark:text-zinc-50">
				{toastItem.title}
			</h4>
			{#if toastItem.description}
				<p class="text-xs leading-relaxed font-medium text-zinc-500 dark:text-zinc-400">
					{toastItem.description}
				</p>
			{/if}
		</div>
	</div>

	<!-- Dismiss Button -->
	<button
		onclick={() => toast.dismiss(toastItem.position, toastItem.id)}
		class="absolute top-4 right-4 rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
		aria-label="Dismiss toast"
	>
		<X class="h-3.5 w-3.5" />
	</button>

	<!-- Auto Close Progress Slider (Indicator) -->
	{#if !toastItem.persistent}
		<div class="absolute right-0 bottom-0 left-0 h-1 bg-zinc-100 dark:bg-zinc-900">
			<div
				class="h-full {config.progressColor} transition-all ease-linear"
				style="width: {toastItem.progress}%; transition-duration: 16ms;"
			></div>
		</div>
	{/if}
</div>
