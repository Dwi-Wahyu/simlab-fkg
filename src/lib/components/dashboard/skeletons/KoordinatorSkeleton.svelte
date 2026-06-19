<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<Skeleton class="mb-2 h-6 w-20" />
	<Skeleton class="h-5 w-48" />

	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		{#each Array(4) as _}
			<Card.Root>
				<Card.Content>
					<Skeleton class="mb-2 h-4 w-28" />
					<Skeleton class="h-8 w-12" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
	<Card.Root>
		<Card.Header><Skeleton class="h-5 w-40" /></Card.Header>
		<Card.Content class="space-y-3">
			{#each Array(4) as _}
				<div class="flex items-center gap-3">
					<Skeleton class="h-4 w-4 rounded-full" />
					<Skeleton class="h-4 w-48" />
					<Skeleton class="ml-auto h-4 w-20" />
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
