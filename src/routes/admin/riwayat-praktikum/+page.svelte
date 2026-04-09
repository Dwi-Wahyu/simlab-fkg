<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { GraduationCap, BookOpen, User, Calendar, Award, FileText } from '@lucide/svelte';

	let { data } = $props();
	const assessments = $derived(data.assessments);

	function formatDate(date: Date | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getScoreColor(score: number) {
		if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
		if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-100';
		if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-100';
		return 'text-red-600 bg-red-50 border-red-100';
	}
</script>

<div class="space-y-8 p-8">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold text-slate-900">
				<GraduationCap class="text-emerald-600" size={32} />
				Riwayat Hasil Praktikum
			</h1>
			<p class="mt-1 text-slate-500">
				Daftar nilai dan feedback dari seluruh kegiatan praktikum yang telah diikuti
			</p>
		</div>
	</div>

	<!-- Summary Info -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<Card.Root class="border-slate-200 bg-white shadow-sm">
			<Card.Content>
				<div class="flex items-center gap-4">
					<div class="rounded-full bg-emerald-100 p-3 text-emerald-600">
						<BookOpen size={24} />
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Total Praktikum</p>
						<h3 class="text-2xl font-bold text-slate-900">{assessments.length}</h3>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		{#if assessments.length > 0}
			{@const avgScore =
				assessments.reduce((acc, curr) => acc + curr.score, 0) / assessments.length}
			<Card.Root class="border-slate-200 bg-white shadow-sm">
				<Card.Content>
					<div class="flex items-center gap-4">
						<div class="rounded-full bg-blue-100 p-3 text-blue-600">
							<Award size={24} />
						</div>
						<div>
							<p class="text-sm font-medium text-slate-500">Rata-rata Nilai</p>
							<h3 class="text-2xl font-bold text-slate-900">{avgScore.toFixed(2)}</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
		<Table.Root>
			<Table.Header class="bg-slate-50/50">
				<Table.Row>
					<Table.Head>Kegiatan & Modul</Table.Head>
					<Table.Head>Laboratorium</Table.Head>
					<Table.Head>Waktu Pelaksanaan</Table.Head>
					<Table.Head>Instruktur</Table.Head>
					<Table.Head class="text-center">Nilai</Table.Head>
					<Table.Head>Catatan</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each assessments as item (item.id)}
					<Table.Row class="transition-colors hover:bg-slate-50/50">
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-bold text-slate-900">{item.scheduleTitle}</span>
								<span class="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
									<BookOpen size={12} />
									{item.moduleName}
								</span>
								<span
									class="mt-0.5 text-[10px] font-medium tracking-wider text-slate-400 uppercase"
								>
									{item.blockName}
								</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm font-medium text-slate-700">{item.laboratoriumName}</span>
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-col text-xs text-slate-600">
								<span class="flex items-center gap-1"
									><Calendar size={12} /> {formatDate(item.startTime)}</span
								>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div
									class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500"
								>
									<User size={12} />
								</div>
								<span class="text-sm font-medium text-slate-900">{item.instructorName}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="text-center">
							<Badge
								variant="outline"
								class="px-4 py-1 text-lg font-bold {getScoreColor(item.score)}"
							>
								{item.score}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							{#if item.notes}
								<p class="line-clamp-2 text-xs text-slate-600 italic">"{item.notes}"</p>
							{:else}
								<span class="text-xs text-slate-400">-</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-64 text-center">
							<div class="flex flex-col items-center justify-center text-slate-400 gap-2">
								<FileText size={48} strokeWidth={1} />
								<p>Belum ada riwayat praktikum yang tersedia</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
