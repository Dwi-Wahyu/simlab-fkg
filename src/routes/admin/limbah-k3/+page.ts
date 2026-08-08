import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	// The data is streamed from +page.server.ts
	// We pass the promise directly to the page to allow streaming and showing skeleton UI
	return {
		streamed: data.streamed
	};
};
