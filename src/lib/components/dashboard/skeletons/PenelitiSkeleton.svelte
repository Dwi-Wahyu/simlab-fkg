<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<Skeleton class="mb-2 h-6 w-20" />
	<Skeleton class="h-5 w-48" />

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root class="md:col-span-2">
			<Card.Header><Skeleton class="h-5 w-36" /></Card.Header>
			<Card.Content class="space-y-3">
				{#each Array(3) as _}
					<div class="flex items-center gap-3 rounded border p-2">
						<Skeleton class="h-8 w-8 rounded" />
						<div class="flex-1 space-y-1">
							<Skeleton class="h-4 w-40" />
							<Skeleton class="h-3 w-24" />
						</div>
						<Skeleton class="h-6 w-20 rounded-full" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Skeleton class="h-5 w-28" /></Card.Header>
			<Card.Content>
				<Skeleton class="h-32 w-full" />
			</Card.Content>
		</Card.Root>
	</div>
</div>
