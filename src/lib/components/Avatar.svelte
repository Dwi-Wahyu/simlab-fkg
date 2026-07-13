<script lang="ts">
	let { src = '', alt = '', initials = '', class: className = '' } = $props();
</script>

<div class="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full {className}">
	{#if src}
		<img {src} {alt} class="aspect-square h-full w-full object-cover" />
	{:else}
		<div
			class="flex h-full w-full items-center justify-center bg-[#E8F0ED] font-bold text-[#2D5A43]"
		>
			{initials}
		</div>
	{/if}
</div>
