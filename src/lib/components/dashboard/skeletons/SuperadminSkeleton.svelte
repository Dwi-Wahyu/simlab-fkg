<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="space-y-6">
	<!-- Stat Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		{#each Array(4) as _}
			<Card.Root>
				<Card.Content>
					<Skeleton class="mb-2 h-4 w-24" />
					<Skeleton class="h-8 w-16" />
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
	<!-- Audit Log Table -->
	<Card.Root>
		<Card.Header><Skeleton class="h-5 w-32" /></Card.Header>
		<Card.Content class="space-y-3">
			{#each Array(6) as _}
				<div class="flex gap-4">
					<Skeleton class="h-4 w-24" />
					<Skeleton class="h-4 w-32" />
					<Skeleton class="h-4 w-20" />
					<Skeleton class="ml-auto h-4 w-16" />
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
