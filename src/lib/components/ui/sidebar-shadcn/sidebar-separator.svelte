<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { ref = $bindable(null), class: className, ...restProps } = $props();
</script>

<div
	bind:this={ref}
	data-sidebar="separator"
	class={cn('mx-3 h-px bg-sidebar-border', className)}
	{...restProps}
></div>
