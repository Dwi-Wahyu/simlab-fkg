<script lang="ts">
	import { getContext } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		mobileAware = getContext<{ value: boolean }>('card-mobile-aware')?.value ?? false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		mobileAware?: boolean;
	} = $props();

	const pxClass = $derived(
		mobileAware
			? 'px-0 md:px-6 md:group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:px-0'
			: 'px-6 group-data-[size=sm]/card:px-4'
	);
</script>

<div bind:this={ref} data-slot="card-content" class={cn(pxClass, className)} {...restProps}>
	{@render children?.()}
</div>
