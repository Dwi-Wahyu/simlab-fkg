import type { User, Session } from 'better-auth/minimal';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User & {
				role: string;
			};
			session?: Session;

			// Menggunakan inferensi otomatis dari instance auth
			// user: typeof auth.$Infer.Session.user & {
			// 	organizations: Array<{
			// 		id: string;
			// 		name: string;
			// 		slug: string;
			// 		role: string;
			// 		createdAt: Date;
			// 	}>;
			// };
			// session: typeof auth.$Infer.Session.session;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
