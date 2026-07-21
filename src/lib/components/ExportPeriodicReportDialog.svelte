<script lang="ts">
	import {
		DateFormatter,
		getLocalTimeZone,
		today,
		type DateValue
	} from '@internationalized/date';
	import { Calendar as CalendarIcon, Download } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	interface Props {
		open?: boolean;
		reportLabel: string;
		exportBasePath: string;
		labs?: Array<{ id: string; name: string }>;
		isRestrictedLabUser?: boolean;
		userLabId?: string;
	}

	let {
		open = $bindable(false),
		reportLabel,
		exportBasePath,
		labs = [],
		isRestrictedLabUser = false,
		userLabId = ''
	}: Props = $props();

	let periodMode = $state<'monthly' | 'semester'>('monthly');

	const df = new DateFormatter('id-ID', { dateStyle: 'medium' });

	let monthlyDate = $state<DateValue | undefined>(today(getLocalTimeZone()));
	let startDate = $state<DateValue | undefined>(today(getLocalTimeZone()).subtract({ months: 6 }));
	let endDate = $state<DateValue | undefined>(today(getLocalTimeZone()));

	let selectedLabId = $state<string>('');

	$effect(() => {
		if (isRestrictedLabUser && userLabId) {
			selectedLabId = userLabId;
		} else if (!selectedLabId && labs.length > 0) {
			selectedLabId = labs[0].id;
		}
	});

	const targetLabName = $derived(
		labs.find((l) => l.id === selectedLabId)?.name ?? 'Pilih Laboratorium'
	);

	const isDateRangeInvalid = $derived(
		periodMode === 'semester' &&
			Boolean(startDate && endDate && endDate.compare(startDate) < 0)
	);

	const isSubmitDisabled = $derived(
		(!isRestrictedLabUser && !selectedLabId) ||
			(periodMode === 'monthly' && !monthlyDate) ||
			(periodMode === 'semester' && (!startDate || !endDate || isDateRangeInvalid))
	);

	function buildExportUrl(): string {
		const params = new URLSearchParams();
		params.set('mode', periodMode);

		if (periodMode === 'monthly' && monthlyDate) {
			params.set('date', monthlyDate.toString());
		} else if (periodMode === 'semester' && startDate && endDate) {
			params.set('start', startDate.toString());
			params.set('end', endDate.toString());
		}

		if (!isRestrictedLabUser && selectedLabId) {
			params.set('labId', selectedLabId);
		}

		return `${exportBasePath}?${params.toString()}`;
	}

	function handleDownload() {
		if (isSubmitDisabled) return;
		const url = buildExportUrl();
		window.location.href = url;
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{reportLabel}</Dialog.Title>
			<Dialog.Description>
				Pilih jenis periode dan laboratorium untuk mengunduh laporan format XLSX.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-5 py-4">
			<!-- Pilihan Jenis Laporan -->
			<div class="flex flex-col gap-2">
				<Label class="text-xs font-semibold uppercase text-slate-500">Jenis Periode Laporan</Label>
				<div class="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant={periodMode === 'monthly' ? 'default' : 'outline'}
						class={periodMode === 'monthly' ? 'bg-[#2D5A47] text-white hover:bg-[#234735]' : ''}
						onclick={() => (periodMode = 'monthly')}
					>
						Bulanan
					</Button>
					<Button
						type="button"
						variant={periodMode === 'semester' ? 'default' : 'outline'}
						class={periodMode === 'semester' ? 'bg-[#2D5A47] text-white hover:bg-[#234735]' : ''}
						onclick={() => (periodMode = 'semester')}
					>
						Semester
					</Button>
				</div>
			</div>

			<!-- Filter Laboratorium (Jika Admin / Koordinator) -->
			{#if !isRestrictedLabUser}
				<div class="flex flex-col gap-2">
					<Label for="labSelect" class="text-xs font-semibold uppercase text-slate-500">Laboratorium</Label>
					<Select.Root type="single" bind:value={selectedLabId}>
						<Select.Trigger id="labSelect" class="w-full text-left">
							{targetLabName}
						</Select.Trigger>
						<Select.Content>
							{#each labs as lab (lab.id)}
								<Select.Item value={lab.id} label={lab.name}>{lab.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<!-- Filter Tanggal Monthly -->
			{#if periodMode === 'monthly'}
				<div class="flex flex-col gap-2">
					<Label class="text-xs font-semibold uppercase text-slate-500">Pilih Bulan</Label>
					<Popover.Root>
						<Popover.Trigger>
							<Button variant="outline" class="w-full justify-start text-left font-normal">
								<CalendarIcon class="mr-2 h-4 w-4" />
								{monthlyDate ? df.format(monthlyDate.toDate(getLocalTimeZone())) : 'Pilih Tanggal'}
							</Button>
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0" align="start">
							<Calendar type="single" bind:value={monthlyDate as any} />
						</Popover.Content>
					</Popover.Root>
					<p class="text-[11px] text-muted-foreground">
						Laporan akan mencakup tanggal 1 s/d akhir bulan yang dipilih.
					</p>
				</div>
			{:else}
				<!-- Filter Tanggal Semester -->
				<div class="flex flex-col gap-3">
					<div class="grid grid-cols-2 gap-3">
						<div class="flex flex-col gap-1.5">
							<Label class="text-xs font-semibold uppercase text-slate-500">Tanggal Awal</Label>
							<Popover.Root>
								<Popover.Trigger>
									<Button variant="outline" class="w-full justify-start text-left font-normal text-xs px-2.5">
										<CalendarIcon class="mr-1.5 h-3.5 w-3.5" />
										{startDate ? df.format(startDate.toDate(getLocalTimeZone())) : 'Awal'}
									</Button>
								</Popover.Trigger>
								<Popover.Content class="w-auto p-0" align="start">
									<Calendar type="single" bind:value={startDate as any} />
								</Popover.Content>
							</Popover.Root>
						</div>

						<div class="flex flex-col gap-1.5">
							<Label class="text-xs font-semibold uppercase text-slate-500">Tanggal Akhir</Label>
							<Popover.Root>
								<Popover.Trigger>
									<Button variant="outline" class="w-full justify-start text-left font-normal text-xs px-2.5">
										<CalendarIcon class="mr-1.5 h-3.5 w-3.5" />
										{endDate ? df.format(endDate.toDate(getLocalTimeZone())) : 'Akhir'}
									</Button>
								</Popover.Trigger>
								<Popover.Content class="w-auto p-0" align="start">
									<Calendar type="single" bind:value={endDate as any} />
								</Popover.Content>
							</Popover.Root>
						</div>
					</div>

					{#if isDateRangeInvalid}
						<p class="text-xs text-destructive font-medium">
							Tanggal akhir tidak boleh lebih awal dari tanggal awal.
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Batal</Button>
			<Button
				disabled={isSubmitDisabled}
				onclick={handleDownload}
				class="bg-[#2D5A47] text-white hover:bg-[#234735] gap-2"
			>
				<Download class="size-4" /> Unduh Laporan
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
