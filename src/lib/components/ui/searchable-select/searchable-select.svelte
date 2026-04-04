<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { setContext } from 'svelte';

	let {
		open = $bindable(false),
		value = $bindable(),
		...restProps
	}: SelectPrimitive.RootProps = $props();

	let searchValue = $state('');

	setContext('SEARCHABLE_SELECT_STATE', {
		get searchValue() {
			return searchValue;
		},
		set searchValue(v: string) {
			searchValue = v;
		}
	});

	// Reset search value when closed
	$effect(() => {
		if (!open) {
			searchValue = '';
		}
	});
</script>

<SelectPrimitive.Root bind:open bind:value={value as never} {...restProps} />
