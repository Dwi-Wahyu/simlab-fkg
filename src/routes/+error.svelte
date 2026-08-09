<script lang="ts">
	import { ArrowLeft, FileQuestion, Home, RefreshCw, ShieldAlert, AlertTriangle } from '@lucide/svelte';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';

	const status = $derived(page.status);
	const message = $derived(page.error?.message || 'Terjadi kesalahan sistem internal.');

	const errorDetails = $derived.by(() => {
		if (status === 404) {
			return {
				title: 'Halaman Tidak Ditemukan',
				description: 'Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.',
				icon: FileQuestion,
				iconColor: 'text-amber-600 bg-amber-50 border border-amber-200'
			};
		}
		if (status === 403) {
			return {
				title: 'Akses Ditolak',
				description: 'Anda tidak memiliki hak akses untuk membuka halaman ini.',
				icon: ShieldAlert,
				iconColor: 'text-rose-600 bg-rose-50 border border-rose-200'
			};
		}
		return {
			title: 'Kesalahan Sistem Internal',
			description: 'Terjadi kesalahan server internal. Kami sedang memproses dan memperbaikinya segera.',
			icon: AlertTriangle,
			iconColor: 'text-red-600 bg-red-50 border border-red-200'
		};
	});

	const homePath = $derived(page.data?.user ? '/admin/dashboard' : '/');

	function goBack() {
		if (typeof window !== 'undefined') {
			window.history.back();
		}
	}

	function reloadPage() {
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>{status} - {errorDetails.title} | SIM-Lab FKG UNHAS</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-6 py-12 font-sans text-[#181d18]"
>
	<div
		class="w-full max-w-md animate-in space-y-8 text-center duration-500 fade-in slide-in-from-bottom-4"
	>
		<!-- Error Icon & Code -->
		<div class="flex flex-col items-center justify-center space-y-4">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-3xl {errorDetails.iconColor} shadow-xs"
			>
				<errorDetails.icon size={44} />
			</div>
			<div class="space-y-1">
				<span class="text-7xl font-extrabold tracking-tight text-slate-900 select-none">
					{status}
				</span>
				<h1 class="text-2xl font-bold tracking-tight text-slate-800">
					{errorDetails.title}
				</h1>
			</div>
		</div>

		<!-- Error Message Card -->
		<div class="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs">
			<h2 class="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Detail Error
			</h2>
			<p class="text-sm leading-relaxed font-medium text-slate-600">
				{errorDetails.description}
			</p>
			{#if status !== 404}
				<div class="mt-3 border-t border-slate-100 pt-3">
					<p class="rounded-lg bg-red-50/75 p-3 font-mono text-xs break-all text-red-600 border border-red-100">
						{message}
					</p>
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
			<Button
				variant="outline"
				onclick={goBack}
				class="h-10 w-full justify-center gap-2 rounded-xl border-slate-200 px-4 text-slate-700 hover:bg-slate-50 sm:w-auto"
			>
				<ArrowLeft size={16} />
				Kembali
			</Button>

			{#if status >= 500}
				<Button
					variant="outline"
					onclick={reloadPage}
					class="h-10 w-full justify-center gap-2 rounded-xl border-slate-200 px-4 text-slate-700 hover:bg-slate-50 sm:w-auto"
				>
					<RefreshCw size={16} />
					Muat Ulang
				</Button>
			{/if}

			<Button
				href={homePath}
				class="h-10 w-full justify-center gap-2 rounded-xl bg-[#2D5A43] px-4 text-white hover:bg-[#234735] sm:w-auto"
			>
				<Home size={16} />
				Dashboard
			</Button>
		</div>

		<footer class="pt-8 text-xs text-slate-400">
			<p>© 2026 Laboratorium Keterampilan Klinik FKG UNHAS</p>
		</footer>
	</div>
</div>
