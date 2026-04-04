<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Eye, QrCode, Pencil } from '@lucide/svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { id }: { id: string } = $props();
</script>

<div class="flex items-center gap-2">
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon"
						class="size-8"
						href="/admin/inventori/{id}/edit"
					>
						<Pencil class="size-4" />
						<span class="sr-only">Edit</span>
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>Edit Item</p>
			</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon"
						class="size-8"
						onclick={() => console.log('View detail', id)}
					>
						<Eye class="size-4" />
						<span class="sr-only">Detail</span>
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>Lihat Detail</p>
			</Tooltip.Content>
		</Tooltip.Root>

		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" class="size-8" onclick={() => alert('QR Code dummy untuk ID: ' + id)}>
						<QrCode class="size-4" />
						<span class="sr-only">QR Code</span>
					</Button>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<p>Tampilkan QR Code</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
</div>
