import { createAuthClient } from 'better-auth/svelte';
import { customSessionClient, organizationClient } from 'better-auth/client/plugins';
import { apiKeyClient } from '@better-auth/api-key/client';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [apiKeyClient(), usernameClient(), customSessionClient(), organizationClient()]
});
