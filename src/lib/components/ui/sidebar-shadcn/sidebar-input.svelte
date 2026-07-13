<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let { ref = $bindable(null), class: className, ...restProps } = $props();
</script>

<Input
	bind:ref
	data-sidebar="input"
	class={cn(
		'h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
		className
	)}
	{...restProps}
/>
