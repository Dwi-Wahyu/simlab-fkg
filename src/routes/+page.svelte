<script lang="ts">
	import { enhance, applyAction } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { User, Lock } from '@lucide/svelte';
	import { base } from '$app/paths';

	let { form } = $props();

	function handleSignIn() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'redirect') {
				toast.success('Login Berhasil', {
					description: 'Selamat datang kembali di sistem SIM-Lab.'
				});
			} else if (result.type === 'failure') {
				toast.error('Login Gagal', {
					description: result.data?.message || 'Periksa kembali username dan password Anda.'
				});
			}

			// Menjalankan aksi bawaan SvelteKit (termasuk redirect)
			await applyAction(result);
		};
	}
</script>

<div
	class="flex min-h-svh w-full flex-col items-center justify-center bg-[#F1F5F9] p-4 font-sans md:flex-row md:p-12"
>
	<!-- Left Side -->
	<div class="hidden w-full flex-col items-center justify-center space-y-12 md:flex md:w-1/2">
		<div class="flex flex-col items-center space-y-4 text-center">
			<div class="flex items-center justify-center">
				<img src="{base}/logo-unhas.webp" class="h-20 w-16" alt="logo unhas" />
			</div>
			<div class="space-y-1">
				<h1 class="text-5xl font-extrabold tracking-tight text-[#457B64]">SIM-Lab</h1>
				<p class="text-xl font-semibold text-gray-600">Sistem Informasi Pengelolaan Laboratorium</p>
				<p class="text-base font-medium text-gray-400">Laboratorium Keterampilan Klinik FKG</p>
			</div>
		</div>

		<!-- <div
			class="relative w-full max-w-lg overflow-hidden rounded-[3rem] border-[12px] border-white shadow-2xl"
		>
			<img src={'/login-image.jpg'} alt="Microscope" class="h-auto w-full object-cover" />
		</div> -->
	</div>

	<!-- Right Side -->
	<div class="flex w-full flex-col items-center justify-center md:w-1/2">
		<div
			class="relative w-full max-w-md overflow-hidden rounded-[3rem] border border-white/50 bg-white p-8 shadow-2xl backdrop-blur-sm md:p-12"
		>
			<!-- Decorative Background Element -->
			<div class="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#E8F1ED] opacity-60"></div>

			<div class="relative z-10 mb-10 space-y-2">
				<h2 class="text-3xl font-bold tracking-tight text-gray-800">Selamat Datang Kembali</h2>
				<p class="text-base font-medium text-gray-400">
					Masukkan kredensial Anda untuk melanjutkan
				</p>
			</div>

			<form
				method="post"
				action="?/signIn"
				use:enhance={handleSignIn}
				class="relative z-10 space-y-4"
			>
				<div class="space-y-2">
					<label for="username" class="ml-1 text-sm font-bold text-gray-600">Username</label>
					<div class="group relative">
						<span
							class="absolute top-1/2 left-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#457B64]"
						>
							<User size={22} />
						</span>
						<input
							id="username"
							name="username"
							placeholder="username"
							class="w-full rounded-2xl border-none bg-[#F0F4F2] py-5 pr-6 pl-14 text-base font-medium text-gray-800 ring-offset-white transition-all focus:bg-white focus:ring-2 focus:ring-[#457B64] focus:outline-none"
							required
						/>
					</div>
				</div>

				<div class="space-y-2">
					<label for="password" class="ml-1 text-sm font-bold text-gray-600">Password</label>
					<div class="group relative">
						<span
							class="absolute top-1/2 left-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#457B64]"
						>
							<Lock size={22} />
						</span>
						<input
							type="password"
							id="password"
							name="password"
							placeholder="password"
							class="w-full rounded-2xl border-none bg-[#F0F4F2] py-5 pr-6 pl-14 text-base font-medium text-gray-800 ring-offset-white transition-all focus:bg-white focus:ring-2 focus:ring-[#457B64] focus:outline-none"
							required
						/>
					</div>
				</div>

				{#if form?.message}
					<div class="animate-in rounded-xl bg-red-50 p-4 text-center fade-in slide-in-from-top-2">
						<p class="text-sm font-bold text-red-600">{form.message}</p>
					</div>
				{/if}

				<div class="pt-4">
					<button
						type="submit"
						class="w-full rounded-2xl bg-[#457B64] py-5 text-lg font-bold text-white shadow-xl shadow-[#457B64]/30 transition-all hover:bg-[#3D6D58] hover:shadow-[#457B64]/40 active:scale-[0.98]"
					>
						Masuk ke Sistem
					</button>
				</div>

				<div class="text-center">
					<a
						href="{base}/lupa-password"
						class="text-sm font-bold text-[#457B64] transition-colors hover:text-[#3D6D58] hover:underline"
					>
						Lupa password?
					</a>
				</div>
			</form>
		</div>

		<!-- Footer Badge -->
		<!-- <div
			class="mt-10 flex items-center space-x-3 rounded-full border border-gray-100 bg-white/80 px-8 py-3 shadow-sm backdrop-blur-sm"
		>
			<div class="rounded-full bg-[#E8F1ED] p-1">
				<ShieldCheck size={18} class="text-[#457B64]" />
			</div>
			<span class="text-xs font-bold tracking-wide text-gray-500">
				Sesuai standar GLP, ISO 15189/17025, dan SPMI
			</span>
		</div> -->
	</div>
</div>
