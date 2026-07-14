<script lang="ts">
	import {
		Briefcase,
		ClipboardCheck,
		Eye,
		EyeOff,
		GraduationCap,
		Loader2,
		Lock,
		LogIn,
		Package,
		Search,
		ShieldAlert,
		Terminal,
		User,
		UserCog,
		Wrench
	} from '@lucide/svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import { applyAction, enhance } from '$app/forms';
	import { toast } from '$lib/components/toast';
	import * as Dialog from '$lib/components/ui/dialog';

	let { form } = $props();
	let showPassword = $state(false);
	let isLoading = $state(false);
	let isDevModeOpen = $state(false);

	let username = $state('');
	let password = $state('');
	let loginFormElement = $state<HTMLFormElement>();

	const quickAccessUsers = [
		{ name: 'Superadmin', username: 'superadmin', role: 'superadmin' },
		{ name: 'PJ Mata Kuliah', username: 'koordinator', role: 'koordinator' },
		{ name: 'Kepala Lab', username: 'kepalalab', role: 'kepalaLab' },
		{ name: 'DPJP', username: 'dpjp', role: 'instruktur' },
		{ name: 'Mahasiswa', username: 'peneliti', role: 'peneliti' },
		{ name: 'Teknisi', username: 'teknisi', role: 'teknisi' },
		{ name: 'SPMI', username: 'spmi', role: 'spmi' },
		{ name: 'Laboran', username: 'laboran', role: 'laboran' }
	];

	function quickLogin(user: (typeof quickAccessUsers)[0]) {
		username = user.username;
		password = 'password123';
		isDevModeOpen = false;

		setTimeout(() => {
			if (loginFormElement) {
				loginFormElement.requestSubmit();
			}
		}, 50);
	}

	function handleSignIn() {
		isLoading = true;
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'redirect') {
				toast.success('Login Berhasil', {
					description: 'Selamat datang di sistem SIM-Lab.'
				});
			} else {
				isLoading = false;
				if (result.type === 'failure') {
					toast.destructive('Login Gagal', {
						description: result.data?.message || 'Periksa kembali username dan password Anda.'
					});
				}
			}

			// Menjalankan aksi bawaan SvelteKit (termasuk redirect)
			await applyAction(result);
		};
	}

	function togglePassword() {
		showPassword = !showPassword;
	}
</script>

<div
	class="relative flex min-h-screen items-center justify-center font-sans text-[#181d18] md:h-screen md:overflow-hidden"
>
	<!-- Mobile Background Elements -->
	<div class="absolute inset-0 z-0 overflow-hidden md:hidden">
		<div class="absolute inset-0 bg-black/40"></div>
		<!-- GANTI GAMBAR DI DALAM MOBILE BACKGROUND DENGAN INI -->
		<img
			src="/removed_bg.png"
			class="absolute top-1/2 left-1/2 h-auto w-full -translate-x-1/2 -translate-y-1/2 opacity-30 blur-sm"
			alt=""
		/>
	</div>

	<main
		class="relative z-10 mx-auto flex min-h-screen w-full max-w-360 flex-col overflow-hidden bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] md:h-screen md:flex-row md:bg-white"
	>
		<!-- Left Side: Login Form -->
		<section
			class="order-2 flex w-full flex-col items-center justify-center bg-white p-8 md:order-1 md:w-1/2 md:p-16"
		>
			<div class="w-full max-w-md">
				<header class="mb-6 flex flex-col text-center">
					<div class="mb-8 hidden flex-col items-center gap-4 md:flex md:flex-row">
						<img src="/logo-unhas.webp" class="h-12 w-auto object-contain" alt="Logo Unhas" />
						<div class="flex flex-col">
							<span class="text-xl leading-tight font-bold text-[#181d18]">
								Fakultas Kedokteran Gigi
							</span>
							<span class="text-start text-base text-muted-foreground">Universitas Hasanuddin</span>
						</div>
					</div>
					<h1 class="mb-1 text-start text-3xl font-bold text-[#181d18] md:text-4xl">
						Selamat Datang
					</h1>
					<p class="text-start text-base text-muted-foreground">
						Masukkan kredensial Anda untuk melanjutkan
					</p>
				</header>

				<form
					bind:this={loginFormElement}
					method="post"
					action="?/signIn"
					use:enhance={handleSignIn}
					class="space-y-6"
				>
					<!-- Username Field -->
					<div class="group space-y-1">
						<label class="block px-1 text-sm font-medium text-muted-foreground" for="username">
							Username
						</label>
						<div
							class="relative flex items-center rounded-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-[#006a34]/10"
						>
							<span class="absolute left-4 text-[#6f7a6f] group-focus-within:text-[#006a34]">
								<User size={20} />
							</span>
							<input
								id="username"
								name="username"
								bind:value={username}
								placeholder="Masukkan username"
								type="text"
								class="w-full rounded-2xl border-transparent bg-[#f0f5ed] py-3.5 pr-4 pl-12 text-base text-[#181d18] transition-all outline-none placeholder:text-[#becabd] focus:border-[#006a34] focus:ring-0"
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
								placeholder="Masukkan password"
								type={showPassword ? 'text' : 'password'}
								class="w-full rounded-2xl border-transparent bg-[#f0f5ed] py-3.5 pr-12 pl-12 text-base text-[#181d18] transition-all outline-none placeholder:text-[#becabd] focus:border-[#006a34] focus:ring-0"
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

					<!-- Options Row -->
					<div class="flex items-center justify-between py-1 text-sm">
						<label class="flex cursor-pointer items-center gap-2 select-none">
							<input
								type="checkbox"
								class="h-5 w-5 rounded border-[#becabd] bg-[#ebefe7] text-[#006a34] focus:ring-[#006a34] focus:ring-offset-0"
							/>
							<span class="text-muted-foreground">Remember me</span>
						</label>
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a
							href="/lupa-password"
							class="font-semibold text-[#006a34] transition-all hover:underline"
						>
							Lupa password?
						</a>
					</div>

					<!-- Submit CTA -->
					<div class="pt-2">
						<button
							type="submit"
							disabled={isLoading}
							class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#006a34] py-4 text-lg font-semibold text-white shadow-sm transition-all hover:bg-[#268549] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
						>
							{#if isLoading}
								<Loader2 size={20} class="animate-spin" />
								Memproses...
							{:else}
								<LogIn size={20} />
								Masuk ke Sistem
							{/if}
						</button>
					</div>
				</form>

				<!-- Developer Mode Toggle -->
				<!-- <div class="mt-8 flex justify-center">
					<button
						type="button"
						onclick={() => (isDevModeOpen = true)}
						class="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-[#006a34]"
					>
						<Terminal size={14} />
						Developer Mode
					</button>
				</div> -->

				<!-- Developer Mode Dialog -->
				<Dialog.Root bind:open={isDevModeOpen}>
					<Dialog.Content class="sm:max-w-lg">
						<Dialog.Header>
							<Dialog.Title>Quick Access (Developer Mode)</Dialog.Title>
							<Dialog.Description>
								Pilih salah satu akun di bawah untuk login cepat ke dalam sistem.
							</Dialog.Description>
						</Dialog.Header>
						<div class="grid grid-cols-1 gap-2 py-4 sm:grid-cols-2">
							{#each quickAccessUsers as user (user.username)}
								<button
									type="button"
									onclick={() => quickLogin(user)}
									class="flex items-center gap-3 rounded-xl border border-[#becabd]/40 bg-[#f0f5ed]/50 p-3 text-sm font-medium text-[#181d18] transition-all duration-200 hover:scale-[1.02] hover:border-[#006a34]/30 hover:bg-[#006a34]/10 active:scale-[0.98]"
								>
									<span class="text-[#006a34]">
										{#if user.role === 'superadmin'}
											<ShieldAlert size={18} />
										{:else if user.role === 'koordinator'}
											<Briefcase size={18} />
										{:else if user.role === 'kepalaLab'}
											<UserCog size={18} />
										{:else if user.role === 'instruktur'}
											<GraduationCap size={18} />
										{:else if user.role === 'peneliti'}
											<Search size={18} />
										{:else if user.role === 'teknisi'}
											<Wrench size={18} />
										{:else if user.role === 'spmi'}
											<ClipboardCheck size={18} />
										{:else if user.role === 'laboran'}
											<Package size={18} />
										{/if}
									</span>
									<div class="flex flex-col items-start text-left">
										<span class="font-bold">{user.name}</span>
										<span class="text-xs font-normal text-muted-foreground">@{user.username}</span>
									</div>
								</button>
							{/each}
						</div>
					</Dialog.Content>
				</Dialog.Root>

				<div class="mt-6 text-center text-sm text-muted-foreground">
					Mahasiswa yang ingin meminjam alat untuk penelitian, lomba, atau kegiatan organisasi?
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href="/daftar" class="font-semibold text-[#006a34] hover:underline">
						Daftar di sini
					</a>
				</div>

				<footer class="mt-16 text-center">
					<p class="text-xs text-[#6f7a6f]">© 2026 Laboratorium Keterampilan Klinik FKG</p>
				</footer>
			</div>
		</section>

		<!-- Right Side: Branding & Illustration -->
		<section
			class="relative order-1 flex h-[35vh] w-full flex-col items-center justify-center overflow-hidden bg-linear-to-b from-primary/60 to-primary md:order-2 md:h-full md:w-1/2"
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
