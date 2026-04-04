<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn, type WithoutChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		placeholder,
		...restProps
	}: WithoutChild<SelectPrimitive.ValueProps> = $props();
</script>

<SelectPrimitive.Value
	bind:ref
	{placeholder}
	data-slot="select-value"
	class={cn("text-sm data-[placeholder]:text-muted-foreground", className)}
	{...restProps}
/>
