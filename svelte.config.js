import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		serviceWorker: {
			register: false
		},
		adapter: adapter(),
		alias: {
			// '@': './src',
			// '@/*': './src/*'

			'@': './src/lib',
			'@/*': './src/lib/*'
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
