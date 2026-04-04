<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { useSidebar } from './context.svelte';

	let { ref = $bindable(null), class: className, ...restProps } = $props();

	const state = useSidebar();

	function handleToggle() {
		state.toggle();
	}
</script>

<button
	bind:this={ref}
	data-sidebar="rail"
	aria-label="Toggle Sidebar"
	tabindex={-1}
	onclick={handleToggle}
	title="Toggle Sidebar"
	class={cn(
		'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
		'in-data-[side=left]:-right-4 in-data-[side=right]:-left-4',
		'[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
		'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar [[data-collapsible=offcanvas]_&]:hover:bg-sidebar',
		className
	)}
	{...restProps}
></button>
