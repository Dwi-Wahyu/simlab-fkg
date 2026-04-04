<script lang="ts">
	import { PanelLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { useSidebar } from './context.svelte.js';

	let { ref = $bindable(null), class: className, onclick, ...restProps } = $props();

	const state = useSidebar();

	function handleToggle(event: MouseEvent) {
		onclick?.(event);
		state.toggle();
	}
</script>

<Button
	bind:ref
	data-sidebar="trigger"
	variant="ghost"
	size="icon"
	class={cn('h-7 w-7', className)}
	onclick={handleToggle}
	{...restProps}
>
	<PanelLeft />
	<span class="sr-only">Toggle Sidebar</span>
</Button>
