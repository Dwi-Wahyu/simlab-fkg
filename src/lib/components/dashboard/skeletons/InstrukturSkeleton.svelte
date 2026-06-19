<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<Skeleton class="mb-2 h-6 w-20" />
	<Skeleton class="h-5 w-48" />

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		{#each Array(3) as _}
			<Card.Root>
				<Card.Content>
					<Skeleton class="mb-2 h-4 w-32" />
					<Skeleton class="h-8 w-12" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-44" /></Card.Header>
			<Card.Content class="space-y-4">
				{#each Array(3) as _}
					<div class="flex items-start gap-3">
						<Skeleton class="h-10 w-10 flex-shrink-0 rounded-md" />
						<div class="flex-1 space-y-1">
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-3 w-3/4" />
						</div>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-36" /></Card.Header>
			<Card.Content class="space-y-3">
				{#each Array(3) as _}
					<div class="flex gap-3">
						<Skeleton class="h-4 w-36" />
						<Skeleton class="ml-auto h-4 w-16" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
