<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		LayoutDashboard,
		Activity,
		Package,
		ClipboardList,
		ShieldAlert,
		TrendingUp,
		History
	} from '@lucide/svelte';
	import { scaleUtc } from 'd3-scale';
	import { Area, AreaChart, ChartClipPath, PieChart } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { cubicInOut } from 'svelte/easing';

	// Mock Summary Data
	const summaryData = {
		utilisasi: 37,
		alatAktif: { current: 142, total: 212 },
		peminjamanAktif: 24,
		pengembalianHariIni: 5,
		insidenK3: 0
	};

	// Mock Pie Chart Data (Equipment Condition)
	const equipmentStatusData = [
		{ status: 'BAIK', count: 180, color: 'var(--chart-1)' },
		{ status: 'RUSAK_RINGAN', count: 25, color: 'var(--chart-2)' },
		{ status: 'RUSAK_BERAT', count: 7, color: 'var(--chart-5)' }
	];

	const equipmentChartConfig = {
		count: { label: 'Jumlah Unit' },
		BAIK: { label: 'Kondisi Baik', color: 'hsl(var(--chart-1))' },
		RUSAK_RINGAN: { label: 'Rusak Ringan', color: 'hsl(var(--chart-2))' },
		RUSAK_BERAT: { label: 'Rusak Berat', color: 'hsl(var(--chart-5))' }
	} satisfies Chart.ChartConfig;

	// Mock Area Chart Data (Practicum Activity)
	const practicumActivityData = [
		{ date: new Date('2024-04-01'), molar: 12, premolar: 8 },
		{ date: new Date('2024-04-05'), molar: 15, premolar: 10 },
		{ date: new Date('2024-04-10'), molar: 8, premolar: 12 },
		{ date: new Date('2024-04-15'), molar: 20, premolar: 15 },
		{ date: new Date('2024-04-20'), molar: 18, premolar: 22 },
		{ date: new Date('2024-04-25'), molar: 25, premolar: 18 },
		{ date: new Date('2024-04-30'), molar: 22, premolar: 25 },
		{ date: new Date('2024-05-05'), molar: 30, premolar: 20 },
		{ date: new Date('2024-05-10'), molar: 28, premolar: 22 },
		{ date: new Date('2024-05-15'), molar: 35, premolar: 28 },
		{ date: new Date('2024-05-20'), molar: 32, premolar: 30 },
		{ date: new Date('2024-05-25'), molar: 40, premolar: 35 },
		{ date: new Date('2024-05-30'), molar: 38, premolar: 32 },
		{ date: new Date('2024-06-05'), molar: 45, premolar: 38 },
		{ date: new Date('2024-06-10'), molar: 42, premolar: 40 },
		{ date: new Date('2024-06-15'), molar: 50, premolar: 45 },
		{ date: new Date('2024-06-20'), molar: 48, premolar: 42 },
		{ date: new Date('2024-06-25'), molar: 55, premolar: 48 },
		{ date: new Date('2024-06-30'), molar: 52, premolar: 50 }
	];

	let timeRange = $state('90d');

	const areaChartConfig = {
		molar: { label: 'Lab Molar', color: 'hsl(var(--chart-1))' },
		premolar: { label: 'Lab Premolar', color: 'hsl(var(--chart-2))' }
	} satisfies Chart.ChartConfig;

	const filteredAreaData = $derived(
		practicumActivityData.filter((item) => {
			const referenceDate = new Date('2024-06-30');
			let daysToSubtract = 90;
			if (timeRange === '30d') daysToSubtract = 30;
			else if (timeRange === '7d') daysToSubtract = 7;
			referenceDate.setDate(referenceDate.getDate() - daysToSubtract);
			return item.date >= referenceDate;
		})
	);

	const selectedTimeLabel = $derived.by(() => {
		switch (timeRange) {
			case '90d':
				return '3 Bulan Terakhir';
			case '30d':
				return '30 Hari Terakhir';
			case '7d':
				return '7 Hari Terakhir';
			default:
				return '3 Bulan Terakhir';
		}
	});

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0
		}).format(amount);
	}
</script>

<div class="space-y-8 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
			<p class="text-slate-500">Ringkasan operasional dan utilisasi laboratorium FKG UNHAS.</p>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Utilisasi Ruang -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Utilisasi Ruang</Card.Title>
				<Activity class="size-4 text-blue-600" />
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="text-2xl font-bold">{summaryData.utilisasi}%</div>
				<div class="h-2 w-full rounded-full bg-slate-100">
					<div
						class="h-2 rounded-full bg-blue-600 transition-all duration-500"
						style="width: {summaryData.utilisasi}%"
					></div>
				</div>
				<p class="text-xs text-muted-foreground italic">Kapasitas terpakai hari ini</p>
			</Card.Content>
		</Card.Root>

		<!-- Alat Aktif -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Alat Aktif</Card.Title>
				<Package class="size-4 text-emerald-600" />
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="flex items-baseline gap-1">
					<span class="text-2xl font-bold">{summaryData.alatAktif.current}</span>
					<span class="text-sm text-muted-foreground">/ {summaryData.alatAktif.total}</span>
				</div>
				<div class="h-2 w-full rounded-full bg-slate-100">
					<div
						class="h-2 rounded-full bg-emerald-600 transition-all duration-500"
						style="width: {(summaryData.alatAktif.current / summaryData.alatAktif.total) * 100}%"
					></div>
				</div>
				<p class="text-xs text-muted-foreground italic">Unit dalam kondisi ready</p>
			</Card.Content>
		</Card.Root>

		<!-- Peminjaman Aktif -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Peminjaman Aktif</Card.Title>
				<ClipboardList class="size-4 text-amber-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{summaryData.peminjamanAktif}</div>
				<p
					class="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600 text-muted-foreground"
				>
					<History size={12} />
					{summaryData.pengembalianHariIni} pengembalian hari ini
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Insiden K3 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Insiden K3</Card.Title>
				<ShieldAlert class="size-4 text-red-600" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{summaryData.insidenK3}</div>
				<Badge
					variant="outline"
					class="mt-2 border-emerald-100 bg-emerald-50 font-bold tracking-tight text-emerald-700"
				>
					ZERO ACCIDENT
				</Badge>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Charts Row -->
	<div class="grid gap-6 md:grid-cols-5">
		<!-- Pie Chart: Equipment Status -->
		<Card.Root class="flex flex-col md:col-span-2">
			<Card.Header class="items-center">
				<Card.Title>Kondisi Peralatan</Card.Title>
				<Card.Description>Distribusi status unit fisik (Asset)</Card.Description>
			</Card.Header>
			<Card.Content class="flex-1">
				<Chart.Container config={equipmentChartConfig} class="mx-auto aspect-square max-h-[300px]">
					<PieChart
						data={equipmentStatusData}
						key="status"
						value="count"
						label={(d) => {
							const mapping = {
								BAIK: 'Baik',
								RUSAK_RINGAN: 'Ringan',
								RUSAK_BERAT: 'Berat'
							};
							return mapping[d.status as keyof typeof mapping] || d.status;
						}}
						cRange={equipmentStatusData.map((d) => d.color)}
						props={{
							pie: {
								motion: 'tween',
								innerRadius: 60,
								cornerRadius: 4,
								padAngle: 0.02
							}
						}}
						legend
					>
						{#snippet tooltip()}
							<Chart.Tooltip hideLabel />
						{/snippet}
					</PieChart>
				</Chart.Container>
			</Card.Content>
			<Card.Footer class="flex-col gap-2 border-t pt-4 text-sm">
				<div class="flex items-center gap-2 leading-none font-medium text-emerald-600">
					Kondisi alat stabil bulan ini <TrendingUp class="size-4" />
				</div>
				<div class="leading-none text-muted-foreground">
					Total terdaftar: {equipmentStatusData.reduce((acc, curr) => acc + curr.count, 0)} unit
				</div>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
