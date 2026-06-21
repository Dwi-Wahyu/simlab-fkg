<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';

	let {
		show = $bindable(false),
		title = 'Judul Modal',
		description = '',
		confirmLabel = 'Konfirmasi',
		cancelLabel = 'Batal',
		onConfirm = undefined as (() => void) | undefined,
		onCancel = undefined as (() => void) | undefined,
		loading = false,
		wide = false,
		children
	}: {
		show: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
		loading?: boolean;
		wide?: boolean;
		children: Snippet;
	} = $props();

	function close() {
		show = false;
		onCancel?.();
	}

	function confirm() {
		onConfirm?.();
	}
</script>

{#if show}
	<div
		role="button"
		tabindex="0"
		transition:fade={{ duration: 200 }}
		onclick={close}
		onkeydown={(e) => {
			if (e.key === 'Escape') close();
		}}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			transition:fly={{ y: 20, duration: 400, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			class="w-full {wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
		>
			<div class="border-b border-gray-100 p-6">
				<h3 class="text-xl font-bold text-gray-900">{title}</h3>
				{#if description}
					<p class="mt-1 text-sm text-gray-500">{description}</p>
				{/if}
			</div>

			<div class="p-6">
				{@render children()}
			</div>

			<div class="flex justify-end gap-3 bg-gray-50 px-6 py-4">
				<button
					onclick={close}
					disabled={loading}
					class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
				>
					{cancelLabel}
				</button>
				{#if onConfirm}
					<button
						onclick={confirm}
						disabled={loading}
						class="rounded-lg bg-[#2D5A43] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#234735] disabled:opacity-50"
					>
						{loading ? 'Menyimpan...' : confirmLabel}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}