<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { ref = $bindable(null), class: className, children, ...restProps } = $props();
</script>

<div
	bind:this={ref}
	data-sidebar="group-label"
	class={cn(
		'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring transition-[margin,opaicty] duration-200 ease-linear outline-none focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
		'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
