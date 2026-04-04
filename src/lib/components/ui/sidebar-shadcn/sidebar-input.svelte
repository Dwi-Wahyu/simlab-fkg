<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Input } from "$lib/components/ui/input/index.js";

	let { ref = $bindable(null), class: className, ...restProps } = $props();
</script>

<Input
	bind:ref
	data-sidebar="input"
	class={cn(
		"bg-background focus-visible:ring-sidebar-ring h-8 w-full shadow-none focus-visible:ring-2",
		className
	)}
	{...restProps}
/>
