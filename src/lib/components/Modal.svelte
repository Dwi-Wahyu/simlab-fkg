<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Menggunakan $bindable agar status 'show' bisa diubah dari dalam (saat klik close)
	let {
		show = $bindable(false),
		title = 'Judul Modal',
		description = 'Deskripsi konten modal di sini.'
	} = $props<{
		show: boolean;
		title?: string;
		description?: string;
	}>();

	function close() {
		show = false;
	}
</script>

{#if show}
	<div
		role="button"
		tabindex="0"
		transition:fade={{ duration: 200 }}
		onclick={close}
		onkeydown={(e) => {
			if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
				close();
			}
		}}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			transition:fly={{ y: 20, duration: 400, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			class="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
		>
			<div class="border-b border-gray-100 p-6">
				<h3 class="text-xl font-bold text-gray-900">{title}</h3>
			</div>

			<div class="p-6 text-gray-600">
				<p>{description}</p>
			</div>

			<div class="flex justify-end gap-3 bg-gray-50 p-4">
				<button
					onclick={close}
					class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
				>
					Batal
				</button>
				<button
					onclick={close}
					class="hover:bg-opacity-90 rounded-lg bg-[#2D5A43] px-4 py-2 text-sm font-medium text-white transition"
				>
					Konfirmasi
				</button>
			</div>
		</div>
	</div>
{/if}
