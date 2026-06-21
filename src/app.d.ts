import type { Session, User } from 'better-auth/minimal';

/// <reference types="@vite-pwa/sveltekit/client" />
/// <reference types="vite-plugin-pwa/info" />

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user:
				| (User & {
						username: string;
						role: string;
						laboratorium?: {
							id: string;
							name: string;
							slug: string;
							logo: string;
						};
				  })
				| null;
			session: Session | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
