<script lang="ts">
	import { toast, type ToastPosition, type ToastType } from '$lib/components/toast';
	import {
		Play,
		Sparkles,
		Code,
		CheckCircle,
		Info,
		AlertTriangle,
		XCircle,
		ArrowLeft
	} from '@lucide/svelte';

	// Demo form states
	let title = $state('Notifikasi Baru');
	let description = $state('Ini adalah contoh deskripsi detail untuk notifikasi toast.');
	let type = $state<ToastType>('success');
	let position = $state<ToastPosition>('bottom-right');
	let duration = $state(4000);
	let persistent = $state(false);

	// Presets
	const presets = [
		{
			label: 'Login Sukses',
			type: 'success' as ToastType,
			title: 'Login Berhasil',
			description: 'Selamat datang kembali! Sesi Anda telah aktif.',
			duration: 3000,
			persistent: false
		},
		{
			label: 'Pemeliharaan Sistem',
			type: 'info' as ToastType,
			title: 'Pembaruan Sistem',
			description: 'Server akan di-restart dalam 10 menit untuk pemeliharaan rutin.',
			duration: 6000,
			persistent: false
		},
		{
			label: 'Koneksi Lemah',
			type: 'warning' as ToastType,
			title: 'Koneksi Terputus',
			description: 'Menghubungkan kembali ke server. Harap tunggu...',
			duration: 5000,
			persistent: true
		},
		{
			label: 'Gagal Menyimpan',
			type: 'destructive' as ToastType,
			title: 'Kesalahan Sistem',
			description: 'Gagal menyimpan data ke database. Silakan coba lagi.',
			duration: 5000,
			persistent: false
		}
	];

	function applyPreset(preset: (typeof presets)[0]) {
		type = preset.type;
		title = preset.title;
		description = preset.description;
		duration = preset.duration;
		persistent = preset.persistent;
	}

	function triggerToast() {
		toast[type](title, {
			description: description || undefined,
			duration: persistent ? undefined : duration,
			persistent,
			position
		});
	}

	// Generate code snippet dynamically
	let codeSnippet = $derived(
		`toast.${type}('${title}', {${description ? `\n    description: "${description}",` : ''}${
			persistent ? '\n    persistent: true,' : `\n    duration: ${duration},`
		}\n    position: "${position}"\n});`
	);
</script>

<div
	class="min-h-screen bg-slate-50/50 p-6 font-sans selection:bg-primary/20 md:p-12 dark:bg-zinc-950"
>
	<div class="mx-auto max-w-5xl space-y-8">
		<!-- Header -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold text-primary">
					<Sparkles class="h-4 w-4" />
					<span>UI Components</span>
				</div>
				<h1
					class="text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50"
				>
					Custom Toast System
				</h1>
				<p class="text-sm text-zinc-500 dark:text-zinc-400">
					Sistem notifikasi toast premium buatan sendiri dengan Svelte 5.
				</p>
			</div>

			<a
				href="/admin"
				class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
			>
				<ArrowLeft class="h-4 w-4" />
				Kembali ke Admin
			</a>
		</div>

		<!-- Dashboard Grid -->
		<div class="grid gap-8 lg:grid-cols-12">
			<!-- Configuration Panel -->
			<div class="space-y-6 lg:col-span-7">
				<div
					class="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50"
				>
					<h2 class="mb-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">Konfigurasi Toast</h2>

					<div class="space-y-5">
						<!-- Preset Buttons -->
						<div class="space-y-2">
							<span class="text-xs font-semibold tracking-wider text-zinc-400 uppercase"
								>Presets Cepat</span
							>
							<div class="flex flex-wrap gap-2">
								{#each presets as preset}
									<button
										onclick={() => applyPreset(preset)}
										class="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
									>
										{preset.label}
									</button>
								{/each}
							</div>
						</div>

						<hr class="border-zinc-100 dark:border-zinc-800/80" />

						<!-- State/Type Selection -->
						<div class="space-y-2">
							<label class="text-xs font-bold text-zinc-700 dark:text-zinc-300" for="state-selector"
								>Tipe Toast</label
							>
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-4" id="state-selector">
								{#each ['success', 'info', 'warning', 'destructive'] as t}
									<button
										onclick={() => (type = t as ToastType)}
										class="flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all
											{type === t
											? 'border-primary bg-primary/5 text-primary'
											: 'border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60'}"
									>
										{#if t === 'success'}
											<CheckCircle class="h-4 w-4" />
										{:else if t === 'info'}
											<Info class="h-4 w-4" />
										{:else if t === 'warning'}
											<AlertTriangle class="h-4 w-4" />
										{:else}
											<XCircle class="h-4 w-4" />
										{/if}
										<span class="capitalize">{t === 'destructive' ? 'danger' : t}</span>
									</button>
								{/each}
							</div>
						</div>

						<!-- Title and Description Input -->
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<label for="title-input" class="text-xs font-bold text-zinc-700 dark:text-zinc-300"
									>Judul Toast</label
								>
								<input
									id="title-input"
									type="text"
									bind:value={title}
									class="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-primary focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
									placeholder="Masukkan judul..."
								/>
							</div>
							<div class="space-y-1.5">
								<label for="desc-input" class="text-xs font-bold text-zinc-700 dark:text-zinc-300"
									>Deskripsi (Opsional)</label
								>
								<input
									id="desc-input"
									type="text"
									bind:value={description}
									class="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-primary focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
									placeholder="Masukkan deskripsi..."
								/>
							</div>
						</div>

						<!-- Position Selection Grid -->
						<div class="space-y-2">
							<label class="text-xs font-bold text-zinc-700 dark:text-zinc-300" for="position-grid"
								>Posisi Layar</label
							>
							<div class="mx-auto grid max-w-md grid-cols-3 gap-2" id="position-grid">
								<!-- Top row -->
								<button
									onclick={() => (position = 'top-left')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'top-left'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Kiri Atas
								</button>
								<button
									onclick={() => (position = 'top-center')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'top-center'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Tengah Atas
								</button>
								<button
									onclick={() => (position = 'top-right')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'top-right'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Kanan Atas
								</button>

								<!-- Middle row -->
								<button
									onclick={() => (position = 'left-center')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'left-center'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Kiri Tengah
								</button>
								<div
									class="flex items-center justify-center text-[10px] font-bold text-zinc-400 uppercase select-none"
								>
									Layar
								</div>
								<button
									onclick={() => (position = 'right-center')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'right-center'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Kanan Tengah
								</button>

								<!-- Bottom row -->
								<button
									onclick={() => (position = 'bottom-left')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'bottom-left'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Kiri Bawah
								</button>
								<button
									onclick={() => (position = 'bottom-center')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'bottom-center'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Tengah Bawah
								</button>
								<button
									onclick={() => (position = 'bottom-right')}
									class="rounded-xl border p-2 text-center text-xs font-semibold capitalize transition-all
										{position === 'bottom-right'
										? 'border-primary bg-primary/5 text-primary'
										: 'border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900'}"
								>
									Kanan Bawah
								</button>
							</div>
						</div>

						<!-- Durations & Options -->
						<div class="grid gap-4 pt-2 sm:grid-cols-2">
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<label
										for="duration-slider"
										class="text-xs font-bold text-zinc-700 dark:text-zinc-300"
										>Durasi: {duration / 1000} Detik</label
									>
									{#if persistent}
										<span
											class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400"
											>Diabaikan</span
										>
									{/if}
								</div>
								<input
									id="duration-slider"
									type="range"
									min="1000"
									max="10000"
									step="500"
									bind:value={duration}
									disabled={persistent}
									class="w-full cursor-pointer accent-primary disabled:opacity-30"
								/>
							</div>

							<div class="flex h-full items-center gap-3 sm:pt-6">
								<input
									id="persistent-checkbox"
									type="checkbox"
									bind:checked={persistent}
									class="h-5 w-5 cursor-pointer rounded border-zinc-300 text-primary focus:ring-primary/20"
								/>
								<label
									for="persistent-checkbox"
									class="cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300"
								>
									Persistent (Harus ditutup manual)
								</label>
							</div>
						</div>

						<hr class="border-zinc-100 dark:border-zinc-800/80" />

						<!-- Trigger Button -->
						<button
							onclick={triggerToast}
							class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
						>
							<Play class="h-4.5 w-4.5 fill-current" />
							Tampilkan Toast
						</button>
					</div>
				</div>
			</div>

			<!-- Live Code Display / Info panel -->
			<div class="space-y-6 lg:col-span-5">
				<!-- Code Box -->
				<div
					class="rounded-3xl border border-zinc-200/80 bg-zinc-900 p-6 text-zinc-100 shadow-sm dark:border-zinc-800/80"
				>
					<div class="mb-4 flex items-center justify-between">
						<div class="flex items-center gap-2 text-xs font-bold text-zinc-400">
							<Code class="h-4 w-4" />
							<span>TypeScript Call</span>
						</div>
					</div>
					<pre
						class="no-scrollbar overflow-x-auto font-mono text-xs leading-relaxed text-emerald-400"><code
							>{codeSnippet}</code
						></pre>
				</div>

				<!-- Feature explanations -->
				<div
					class="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50"
				>
					<h3 class="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
						Fitur Utama Komponen
					</h3>
					<ul class="space-y-3.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
						<li class="flex gap-2.5">
							<span class="font-bold text-emerald-500">✓</span>
							<span
								><strong>Pause on Hover:</strong> Arahkan mouse untuk menjeda hitungan mundur otomatis.</span
							>
						</li>
						<li class="flex gap-2.5">
							<span class="font-bold text-emerald-500">✓</span>
							<span
								><strong>Responsive Grid:</strong> Mendukung 8 posisi layar yang dinamis dan modular.</span
							>
						</li>
						<li class="flex gap-2.5">
							<span class="font-bold text-emerald-500">✓</span>
							<span
								><strong>Auto Close Slider:</strong> Indikator visual premium berupa progress bar di bawah
								kartu.</span
							>
						</li>
						<li class="flex gap-2.5">
							<span class="font-bold text-emerald-500">✓</span>
							<span
								><strong>Fly Transitions:</strong> Animasi masuk dan keluar layar dinamis sesuai posisinya.</span
							>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
