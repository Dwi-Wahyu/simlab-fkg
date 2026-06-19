<script lang="ts">
	import { getContext } from 'svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		mobileAware = getContext<{ value: boolean }>('card-mobile-aware')?.value ?? false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		mobileAware?: boolean;
	} = $props();

	const roundedClass = $derived(mobileAware ? 'rounded-none md:rounded-t-xl' : 'rounded-t-xl');
	const pxClass = $derived(
		mobileAware
			? 'px-0 md:px-6 md:group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:px-0'
			: 'px-6 group-data-[size=sm]/card:px-4'
	);
</script>

<div
	bind:this={ref}
	data-slot="card-header"
	class={cn(
		'group/card-header @container/card-header grid auto-rows-min items-start gap-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4',
		roundedClass,
		pxClass,
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
