<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { status }: { status: string } = $props();

	let variant: 'default' | 'secondary' | 'destructive' | 'outline' = $derived.by(() => {
		if (status === 'BAIK' || status === 'Tersedia' || status === 'READY') return 'default';
		if (status === 'RUSAK_RINGAN' || status === 'Hampir Habis' || status === 'IN_USE') return 'secondary';
		if (status === 'RUSAK_BERAT' || status === 'Habis' || status === 'MAINTENANCE') return 'destructive';
		return 'outline';
	});
</script>

<Badge {variant} class="capitalize">
	{status.replace('_', ' ')}
</Badge>
