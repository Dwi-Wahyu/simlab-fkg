<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { ref = $bindable(null), class: className, ...restProps } = $props();
</script>

<div
	bind:this={ref}
	data-sidebar="separator"
	class={cn("bg-sidebar-border mx-3 h-px", className)}
	{...restProps}
></div>
