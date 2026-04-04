<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_MOBILE } from "./constants.js";
	import { setSidebarState } from "./context.svelte.js";

	let {
		ref = $bindable(null),
		open = $bindable(true),
		onOpenChange,
		class: className,
		style,
		children,
		...restProps
	} = $props();

	const state = setSidebarState(open);

	$effect(() => {
		state.setOpen(open);
	});

	$effect(() => {
		if (onOpenChange) {
			onOpenChange(state.open);
		}
		open = state.open;
		// document.cookie = `${SIDEBAR_COOKIE_NAME}=${state.open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
	});

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			state.toggle();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	bind:this={ref}
	style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-mobile: {SIDEBAR_WIDTH_MOBILE}; {style}"
	class={cn(
		"group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
