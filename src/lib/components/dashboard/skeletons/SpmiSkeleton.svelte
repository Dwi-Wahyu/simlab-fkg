<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		{#each Array(4) as _}
			<Card.Root>
				<Card.Content>
					<Skeleton class="mb-2 h-4 w-28" />
					<Skeleton class="h-8 w-16" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
	<Card.Root>
		<Card.Header><Skeleton class="h-5 w-44" /></Card.Header>
		<Card.Content class="mt-1 space-y-2">
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-3 w-40" />
		</Card.Content>
	</Card.Root>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		{#each Array(3) as _}
			<Card.Root>
				<Card.Header><Skeleton class="h-5 w-36" /></Card.Header>
				<Card.Content class="space-y-2">
					{#each Array(3) as _}
						<div class="space-y-1">
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-3 w-20" />
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
