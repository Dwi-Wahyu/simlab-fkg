<script lang="ts">
	import { Eye, EyeOff, IdCard, Loader2, Lock, User, UserPlus } from '@lucide/svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import { applyAction, enhance } from '$app/forms';
	import { toast } from '$lib/components/toast';

	let { form } = $props();
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isLoading = $state(false);

	let name = $state('');
	let username = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	function handleDaftar() {
		if (password !== confirmPassword) {
			toast.destructive('Password tidak cocok', {
				description: 'Pastikan Password dan Konfirmasi Password sama.'
			});
			return;
		}
		isLoading = true;
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'redirect') {
				toast.success('Berhasil', {
					description: 'Selamat datang, silakan lanjutkan pengajuan.'
				});
			} else {
				isLoading = false;
				if (result.type === 'failure') {
					toast.destructive('Gagal', {
						description: result.data?.message || 'Periksa kembali data Anda.'
					});
				}
			}
			await applyAction(result);
		};
	}

	function togglePassword() {
		showPassword = !showPassword;
	}

	function toggleConfirmPassword() {
		showConfirmPassword = !showConfirmPassword;
	}
</script>

<div
	class="relative flex min-h-screen items-center justify-center font-sans text-[#181d18] md:h-screen md:overflow-hidden"
>
	<!-- Mobile Background Elements -->
	<div class="absolute inset-0 z-0 overflow-hidden md:hidden">
		<div class="absolute inset-0 bg-black/40"></div>
		<img
			src="/removed_bg.png"
			class="absolute top-1/2 left-1/2 h-auto w-full -translate-x-1/2 -translate-y-1/2 opacity-30 blur-sm"
			alt=""
		/>
	</div>

	<main
		class="relative z-10 mx-auto flex min-h-screen w-full max-w-360 flex-col overflow-hidden bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] md:h-screen md:flex-row md:bg-white"
	>
		<!-- Left Side: Registration Form -->
		<section
			class="order-2 flex w-full flex-col items-center justify-center overflow-y-auto bg-white p-8 md:order-1 md:h-full md:w-1/2 md:p-16"
		>
			<div class="my-auto w-full max-w-md">
				<header class="mb-6 flex flex-col text-center">
					<h1 class="mb-1 text-start text-3xl font-bold text-[#181d18] md:text-4xl">
						Form Pendaftaran
					</h1>
					<p class="text-start text-sm text-muted-foreground">
						Untuk mengajukan peminjaman alat di luar praktikum (penelitian, lomba, organisasi
						mahasiswa)
					</p>
				</header>

				<form method="post" action="?/daftarAtauMasuk" use:enhance={handleDaftar} class="space-y-4">
					<!-- Nama Lengkap Field -->
					<div class="group space-y-1">
						<label class="block px-1 text-sm font-medium text-muted-foreground" for="name">
							Nama Lengkap
						</label>
						<div
							class="relative flex items-center rounded-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006a34]/10"
						>
							<span class="absolute left-4 text-[#6f7a6f] group-focus-within:text-[#006a34]">
								<User size={20} />
							</span>
							<input
								id="name"
								name="name"
								bind:value={name}
								placeholder="Masukkan nama lengkap Anda"
								type="text"
								class="w-full rounded-2xl border-transparent bg-[#f0f5ed] py-3 pr-4 pl-12 text-base text-[#181d18] transition-all outline-none placeholder:text-[#becabd] focus:border-[#006a34] focus:ring-0"
								required
							/>
						</div>
					</div>

					<!-- NIM Field -->
					<div class="group space-y-1">
						<label class="block px-1 text-sm font-medium text-muted-foreground" for="username">
							NIM (Username)
						</label>
						<div
							class="relative flex items-center rounded-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006a34]/10"
						>
							<span class="absolute left-4 text-[#6f7a6f] group-focus-within:text-[#006a34]">
								<IdCard size={20} />
							</span>
							<input
								id="username"
								name="username"
								bind:value={username}
								placeholder="Masukkan NIM Anda"
								type="text"
								class="w-full rounded-2xl border-transparent bg-[#f0f5ed] py-3 pr-4 pl-12 text-base text-[#181d18] transition-all outline-none placeholder:text-[#becabd] focus:border-[#006a34] focus:ring-0"
								required
							/>
						</div>
					</div>

					<!-- Password Field -->
					<div class="group space-y-1">
						<label class="block px-1 text-sm font-medium text-muted-foreground" for="password">
							Password
						</label>
						<div
							class="relative flex items-center rounded-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006a34]/10"
						>
							<span class="absolute left-4 text-[#6f7a6f] group-focus-within:text-[#006a34]">
								<Lock size={20} />
							</span>
							<input
								id="password"
								name="password"
								bind:value={password}
								placeholder="Minimal 8 karakter"
								type={showPassword ? 'text' : 'password'}
								class="w-full rounded-2xl border-transparent bg-[#f0f5ed] py-3 pr-12 pl-12 text-base text-[#181d18] transition-all outline-none placeholder:text-[#becabd] focus:border-[#006a34] focus:ring-0"
								required
							/>
							<button
								type="button"
								onclick={togglePassword}
								class="absolute right-4 flex items-center text-[#6f7a6f] transition-colors hover:text-muted-foreground"
							>
								{#if showPassword}
									<EyeOff size={20} />
								{:else}
									<Eye size={20} />
								{/if}
							</button>
						</div>
					</div>

					<!-- Confirm Password Field -->
					<div class="group space-y-1">
						<label
							class="block px-1 text-sm font-medium text-muted-foreground"
							for="confirmPassword"
						>
							Konfirmasi Password
						</label>
						<div
							class="relative flex items-center rounded-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006a34]/10"
						>
							<span class="absolute left-4 text-[#6f7a6f] group-focus-within:text-[#006a34]">
								<Lock size={20} />
							</span>
							<input
								id="confirmPassword"
								bind:value={confirmPassword}
								placeholder="Ulangi password Anda"
								type={showConfirmPassword ? 'text' : 'password'}
								class="w-full rounded-2xl border-transparent bg-[#f0f5ed] py-3 pr-12 pl-12 text-base text-[#181d18] transition-all outline-none placeholder:text-[#becabd] focus:border-[#006a34] focus:ring-0"
								required
							/>
							<button
								type="button"
								onclick={toggleConfirmPassword}
								class="absolute right-4 flex items-center text-[#6f7a6f] transition-colors hover:text-muted-foreground"
							>
								{#if showConfirmPassword}
									<EyeOff size={20} />
								{:else}
									<Eye size={20} />
								{/if}
							</button>
						</div>
					</div>

					<!-- Submit CTA -->
					<div class="pt-2">
						<button
							type="submit"
							disabled={isLoading}
							class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#006a34] py-3.5 text-lg font-semibold text-white shadow-sm transition-all hover:bg-[#268549] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
						>
							{#if isLoading}
								<Loader2 size={20} class="animate-spin" />
								Memproses...
							{:else}
								<UserPlus size={20} />
								Daftar / Masuk
							{/if}
						</button>
					</div>
				</form>

				<div class="mt-6 flex flex-col items-center justify-center gap-2 text-center text-sm">
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href="/" class="text-muted-foreground transition-colors hover:text-[#006a34]">
						Sudah punya akun staf/dosen? <span class="font-semibold text-[#006a34] hover:underline"
							>Masuk di sini</span
						>
					</a>
				</div>

				<footer class="mt-8 text-center">
					<p class="text-xs text-[#6f7a6f]">© 2026 Laboratorium Keterampilan Klinik FKG</p>
				</footer>
			</div>
		</section>

		<!-- Right Side: Branding & Illustration -->
		<section
			class="relative order-1 flex h-[25vh] w-full flex-col items-center justify-center overflow-hidden bg-linear-to-b from-primary/60 to-primary md:order-2 md:h-full md:w-1/2"
		>
			<div class="absolute inset-0 z-0">
				<div
					class="absolute inset-0 opacity-45"
					style="background-image: radial-gradient(rgba(255, 255, 255, 0.45) 1.5px, transparent 1.5px); background-size: 24px 24px;"
				></div>

				<img
					src="/removed_bg.png"
					alt=""
					class="relative z-10 h-full w-full object-cover opacity-60 md:translate-y-56 md:object-contain md:object-bottom"
				/>
				<div class="absolute inset-0 z-20 bg-black/45"></div>
			</div>

			<!-- Branding Content -->
			<div class="relative z-10 w-full max-w-lg px-8 text-center text-white md:px-16 md:pb-76">
				<div class="space-y-6">
					<div class="mb-4 flex flex-col items-center justify-center gap-2">
						<h2 class="text-5xl font-bold tracking-tight text-white md:text-7xl">SIM-Lab</h2>
						<!-- Institutional Text for Mobile -->
						<div class="flex flex-col md:hidden">
							<span class="text-sm leading-tight font-bold text-white/90">
								Fakultas Kedokteran Gigi
							</span>
							<span class="text-xs text-white/70">Universitas Hasanuddin</span>
						</div>
					</div>
					<div class="hidden space-y-4 md:block">
						<div class="mx-auto h-1 w-12 rounded-full bg-white/40"></div>
						<p class="text-xl font-medium text-muted md:text-2xl">
							Sistem Informasi Pengelolaan Laboratorium
						</p>
					</div>
				</div>
			</div>
		</section>
	</main>
</div>
