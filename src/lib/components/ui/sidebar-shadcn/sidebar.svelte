<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { useSidebar } from './context.svelte.js';

	let {
		ref = $bindable(null),
		side = 'left',
		variant = 'sidebar',
		collapsible = 'offcanvas',
		class: className,
		children,
		...restProps
	} = $props();

	const state = useSidebar();
</script>

{#if collapsible === 'none'}
	<div
		class={cn(
			'flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground',
			className
		)}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</div>
{:else if state.isMobile}
	<!-- Simple Mobile Overlay (Simulating Sheet) -->
	{#if state.openMobile}
		<div class="fixed inset-0 z-50 flex">
			<button
				class="fixed inset-0 cursor-default bg-black/80"
				onclick={() => state.setOpenMobile(false)}
			></button>
			<div
				class={cn(
					'relative flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300',
					side === 'left' ? 'animate-in slide-in-from-left' : 'animate-in slide-in-from-right'
				)}
			>
				{@render children?.()}
			</div>
		</div>
	{/if}
{:else}
	<div
		bind:this={ref}
		class="group peer hidden text-sidebar-foreground md:block"
		data-state={state.state}
		data-collapsible={state.state === 'collapsed' ? collapsible : ''}
		data-variant={variant}
		data-side={side}
	>
		<!-- Left and Right gaps for layout -->
		<div
			class={cn(
				'relative h-svh w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
				'group-data-[collapsible=offcanvas]:w-0',
				'group-data-[side=right]:rotate-180',
				variant === 'floating' || variant === 'inset'
					? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]'
					: 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)'
			)}
		></div>
		<div
			class={cn(
				'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
				side === 'left'
					? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
					: 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
				// Adjust for variants
				variant === 'floating' || variant === 'inset'
					? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]'
					: 'border-r border-sidebar-border group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
				className
			)}
			{...restProps}
		>
			<div
				data-sidebar="sidebar"
				class="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
			>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
