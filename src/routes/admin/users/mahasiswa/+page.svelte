<script lang="ts">
	import DataTable from './data-table.svelte';
	import { columns } from './columns.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-3xl font-bold tracking-tight">Daftar Mahasiswa</h1>
		<p class="text-muted-foreground">Manajemen data mahasiswa peneliti dan penempatan kelas.</p>
	</div>

	<DataTable 
		data={data.students} 
		{columns} 
		filterOptions={data.filterOptions} 
	/>
</div>
