import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import path from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'SIM-Lab FKG Unhas',
				short_name: 'SIM-Lab',
				description: 'Sistem Informasi Manajemen Laboratorium FKG Unhas',
				theme_color: '#ffffff',
				icons: [
					{
						src: '192x192.png',
						sizes: '161x192',
						type: 'image/png'
					},
					{
						src: '512x512.png',
						sizes: '428x512',
						type: 'image/png'
					},
					{
						src: '512x512.png',
						sizes: '428x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	ssr: {
		noExternal: ['lucide-svelte']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
