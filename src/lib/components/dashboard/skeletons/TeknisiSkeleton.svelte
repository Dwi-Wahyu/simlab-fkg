<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		{#each Array(3) as _}
			<Card.Root>
				<Card.Content>
					<Skeleton class="mb-2 h-4 w-36" />
					<Skeleton class="h-8 w-10" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-44" /></Card.Header>
			<Card.Content class="space-y-3">
				{#each Array(4) as _}
					<div class="space-y-1 rounded border p-2">
						<div class="flex justify-between">
							<Skeleton class="h-4 w-40" />
							<Skeleton class="h-5 w-16 rounded-full" />
						</div>
						<Skeleton class="h-3 w-28" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-40" /></Card.Header>
			<Card.Content class="space-y-3">
				{#each Array(4) as _}
					<div class="flex gap-3">
						<Skeleton class="h-4 w-36" />
						<Skeleton class="ml-auto h-4 w-24" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
