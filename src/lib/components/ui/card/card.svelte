<script lang="ts">
	import { setContext } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = 'default',
		mobileAware = false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		size?: 'default' | 'sm';
		mobileAware?: boolean;
	} = $props();

	setContext('card-mobile-aware', {
		get value() {
			return mobileAware;
		}
	});

	const ringClass = $derived(
		mobileAware ? 'ring-0 md:ring-1 md:ring-foreground/10' : 'ring-1 ring-foreground/10'
	);
	const bgClass = $derived(mobileAware ? 'bg-transparent md:bg-card' : 'bg-card');
	const roundedClass = $derived(mobileAware ? 'rounded-none md:rounded-2xl' : 'rounded-2xl');
	const pyClass = $derived(
		mobileAware
			? 'py-0 md:py-6 data-[size=sm]:py-0 md:data-[size=sm]:py-4'
			: 'py-6 data-[size=sm]:py-4'
	);
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	class={cn(
		'group/card flex flex-col gap-6 overflow-hidden text-sm text-card-foreground has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
		ringClass,
		bgClass,
		roundedClass,
		pyClass,
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
