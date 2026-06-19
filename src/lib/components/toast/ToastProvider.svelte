<script lang="ts">
	import { toast, type ToastPosition } from './toast.svelte';
	import ToastItemComponent from './ToastItem.svelte';

	// Define all supported positions
	const positions: ToastPosition[] = [
		'top-left',
		'top-center',
		'top-right',
		'left-center',
		'right-center',
		'bottom-left',
		'bottom-center',
		'bottom-right'
	];

	// Map positions to their tailwind styling classes
	const positionClasses: Record<ToastPosition, string> = {
		'top-left': 'top-6 left-6 flex flex-col gap-3 items-start',
		'top-center': 'top-6 left-1/2 -translate-x-1/2 flex flex-col gap-3 items-center',
		'top-right': 'top-6 right-6 flex flex-col gap-3 items-end',
		'left-center': 'top-1/2 left-6 -translate-y-1/2 flex flex-col gap-3 items-start',
		'right-center': 'top-1/2 right-6 -translate-y-1/2 flex flex-col gap-3 items-end',
		'bottom-left': 'bottom-6 left-6 flex flex-col-reverse gap-3 items-start',
		'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse gap-3 items-center',
		'bottom-right': 'bottom-6 right-6 flex flex-col-reverse gap-3 items-end'
	};
</script>

<!-- Toast Containers for each position -->
{#each positions as pos}
	{@const activeToasts = toast.toasts[pos]}
	{#if activeToasts.length > 0}
		<div
			class="fixed z-[100] w-full max-w-sm pointer-events-none {positionClasses[pos]}"
			role="alert"
			aria-live="polite"
		>
			{#each activeToasts as item (item.id)}
				<div class="pointer-events-auto w-full transition-all duration-300">
					<ToastItemComponent toastItem={item} />
				</div>
			{/each}
		</div>
	{/if}
{/each}
