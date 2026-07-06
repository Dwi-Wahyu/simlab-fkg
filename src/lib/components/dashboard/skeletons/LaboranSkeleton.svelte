<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<Skeleton class="mb-2 h-6 w-20" />
	<Skeleton class="h-5 w-48" />

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
		{#each Array(5) as _}
			<Card.Root>
				<Card.Content>
					<Skeleton class="mb-2 h-4 w-full" />
					<Skeleton class="h-7 w-10" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-48" /></Card.Header>
			<Card.Content>
				<Skeleton class="h-20 w-full" />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-36" /></Card.Header>
			<Card.Content>
				<Skeleton class="h-20 w-full" />
			</Card.Content>
		</Card.Root>
	</div>
</div>
