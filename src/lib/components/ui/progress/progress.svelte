<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		value = 0,
		max = 100,
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: number;
		max?: number;
	} = $props();
</script>

<div
	bind:this={ref}
	class={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}
	{...restProps}
>
	<div
		class="h-full w-full flex-1 bg-primary transition-all duration-300 animate-in fade-in"
		style="transform: translateX(-{100 - (Math.min(Math.max(value, 0), max) / max) * 100}%)"
	></div>
</div>
