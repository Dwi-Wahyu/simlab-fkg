<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { SelectPortal, SelectScrollUpButton, SelectScrollDownButton } from '$lib/components/ui/select';
	import { cn, type WithoutChild } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';
	import type { WithoutChildrenOrChild } from '$lib/utils.js';
	import { Input } from '$lib/components/ui/input';
	import { Search } from '@lucide/svelte';
	import { getContext } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 4,
		portalProps,
		children,
		preventScroll = true,
		searchPlaceholder = "Cari...",
		...restProps
	}: WithoutChild<SelectPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SelectPortal>>;
		searchPlaceholder?: string;
	} = $props();

	const state = getContext<{ searchValue: string } | undefined>('SEARCHABLE_SELECT_STATE');
</script>

<SelectPortal {...portalProps}>
	<SelectPrimitive.Content
		bind:ref
		{sideOffset}
		{preventScroll}
		data-slot="select-content"
		class={cn(
			'relative isolate z-50 min-w-36 overflow-x-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 flex flex-col',
			className
		)}
		{...restProps}
	>
		<div class="flex items-center px-3 sticky top-0 bg-popover z-10">
			<Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
			<input
				class="flex h-10 w-full rounded-md border-none bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
				placeholder={searchPlaceholder}
				autofocus
				bind:value={state!.searchValue}
				onkeydown={(e) => {
					// Prevent the select from closing when pressing space in the search input
					if (e.key === ' ') {
						e.stopPropagation();
					}
				}}
			/>
		</div>
		
		<SelectScrollUpButton />
		<SelectPrimitive.Viewport
			class={cn(
				'h-full w-full min-w-(--bits-select-anchor-width) scroll-my-1 max-h-[300px] overflow-y-auto'
			)}
		>
			{@render children?.()}
		</SelectPrimitive.Viewport>
		<SelectScrollDownButton />
	</SelectPrimitive.Content>
</SelectPortal>
