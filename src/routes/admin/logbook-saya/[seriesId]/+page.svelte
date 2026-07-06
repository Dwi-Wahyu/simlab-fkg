<script lang="ts">
	import {
		ArrowLeft,
		Award,
		Calendar,
		CheckCircle2,
		ChevronDown,
		ChevronLeft,
		ChevronUp,
		Clock,
		Download,
		FileText,
		FlaskConical,
		Loader2,
		RefreshCw
	} from '@lucide/svelte';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { cn } from '$lib/utils';

	let { data } = $props();
	let expandedItems = $state<Record<string, boolean>>({});

	// Dialog state
	let dialogOpen = $state(false);
	let dialogType = $state<'success' | 'error' | 'info'>('success');
	let dialogTitle = $state('');
	let dialogDescription = $state('');

	function showNotification(
		type: 'success' | 'error' | 'info',
		title: string,
		description: string
	) {
		dialogType = type;
		dialogTitle = title;
		dialogDescription = description;
		dialogOpen = true;
	}

	// Cooldown countdown
	let remainingSeconds = $state(0);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	function startCountdown() {
		if (countdownInterval) clearInterval(countdownInterval);
		if (remainingSeconds <= 0) return;
		countdownInterval = setInterval(() => {
			remainingSeconds = Math.max(0, remainingSeconds - 1);
			if (remainingSeconds === 0 && countdownInterval) {
				clearInterval(countdownInterval);
				countdownInterval = null;
			}
		}, 1000);
	}

	$effect(() => {
		remainingSeconds = data.cooldownRemainingSeconds;
		startCountdown();
	});

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
	});

	function formatCooldown(seconds: number) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return m > 0 ? `${m}m ${s}s` : `${s}s`;
	}

	// Generate state
	let isGenerating = $state(false);
	let isDownloading = $state(false);
	let manualInputs = $state<Record<string, string>>({});

	$effect(() => {
		if (data.manualFields) {
			const inputs: Record<string, string> = {};
			for (const f of data.manualFields) {
				inputs[f.placeholderKey] = f.defaultValue ?? '';
			}
			manualInputs = inputs;
		}
	});

	async function handleGenerate() {
		if (remainingSeconds > 0 || isGenerating) return;

		// Validate required manual fields
		if (data.manualFields) {
			for (const f of data.manualFields) {
				if (f.required && !manualInputs[f.placeholderKey]?.trim()) {
					showNotification('error', 'Gagal!', `Field "${f.label}" wajib diisi.`);
					isGenerating = false;
					return;
				}
			}
		}

		isGenerating = true;
		try {
			const res = await fetch(`/api/logbook/${data.series.id}/download`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ manualInputs })
			});

			if (res.status === 429) {
				const body = await res.json();
				remainingSeconds = body.remainingSeconds ?? 600;
				startCountdown();
				showNotification(
					'error',
					'Gagal!',
					`Harap tunggu ${formatCooldown(remainingSeconds)} sebelum generate ulang.`
				);
				return;
			}

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.message ?? 'Gagal generate logbook');
			}

			showNotification('success', 'Berhasil!', 'Logbook digital berhasil digenerate.');

			// Mulai cooldown 10 menit
			remainingSeconds = 600;
			startCountdown();

			// Reload data halaman agar lastGeneration terupdate
			await goto(`/admin/logbook-saya/${data.series.id}`, {
				invalidateAll: true
			});
		} catch (e: any) {
			showNotification('error', 'Gagal!', e.message ?? 'Terjadi kesalahan');
		} finally {
			isGenerating = false;
		}
	}

	let isDownloadingDocx = $state(false);
	let isDownloadingPdf = $state(false);

	async function handleDownloadDocx() {
		if (isDownloadingDocx) return;
		isDownloadingDocx = true;
		try {
			const res = await fetch(`/api/logbook/${data.series.id}/file`);
			if (!res.ok) throw new Error('File tidak ditemukan');
			const blob = await res.blob();
			triggerDownload(blob, data.lastGeneration?.fileName ?? `logbook-${data.series.id}.docx`);
			toast.success('Logbook DOCX berhasil diunduh');
		} catch (e: any) {
			toast.error(e.message ?? 'Gagal mengunduh file DOCX');
		} finally {
			isDownloadingDocx = false;
		}
	}

	async function handleDownloadPdf() {
		if (isDownloadingPdf || !data.lastGeneration?.pdfUrl) return;
		isDownloadingPdf = true;
		try {
			const res = await fetch(
				`/generated/logbook/${data.lastGeneration.userId}/${data.lastGeneration.pdfUrl}`
			);
			if (!res.ok) throw new Error('File PDF tidak ditemukan');
			const blob = await res.blob();
			triggerDownload(blob, data.lastGeneration.pdfUrl);
			toast('Logbook PDF berhasil diunduh', {
				description: 'Pastikan untuk menyimpan file PDF ini di tempat yang aman.',
				action: {
					label: 'Tutup',
					onClick: () => {}
				}
			});
		} catch (e: any) {
			toast.error(e.message ?? 'Gagal mengunduh file PDF');
		} finally {
			isDownloadingPdf = false;
		}
	}

	function triggerDownload(blob: Blob, name: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
		URL.revokeObjectURL(url);
	}

	function formatDateTime(d: Date | string) {
		return new Intl.DateTimeFormat('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(d));
	}

	function formatTime(d: Date | string) {
		return new Intl.DateTimeFormat('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(d));
	}

	function formatDate(d: Date | string) {
		return new Intl.DateTimeFormat('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		}).format(new Date(d));
	}
</script>

{#snippet generateCard(suffix = '', className = '')}
	<Card.Root class={cn('border-dashed', className)} mobileAware={true}>
		<Card.Content class="flex flex-col gap-3">
			<h2 class="text-lg font-semibold">Logbook Digital</h2>

			{#if data.lastGeneration}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<CheckCircle2 class="h-3.5 w-3.5 text-emerald-500" />
					Terakhir: {formatDateTime(data.lastGeneration.generatedAt)}
				</div>
				{#if data.lastGeneration.pdfUrl}
					<div class="mt-2 overflow-hidden rounded-lg border bg-slate-50 shadow-inner">
						<iframe
							src={`/generated/logbook/${data.lastGeneration.userId}/${data.lastGeneration.pdfUrl}`}
							title="Preview Logbook PDF"
							class="h-100 w-full border-0"
						></iframe>
					</div>
				{/if}
			{:else}
				<p class="text-xs text-muted-foreground">Belum pernah digenerate.</p>
			{/if}

			{#if data.manualFields && data.manualFields.length > 0}
				<div
					class="my-1 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs"
				>
					<p class="font-semibold text-foreground">Informasi Tambahan Logbook</p>
					{#each data.manualFields as field}
						<div class="flex flex-col gap-1.5">
							<label
								for={field.placeholderKey + suffix}
								class="text-[10px] font-bold text-muted-foreground uppercase"
							>
								{field.label}
								{#if field.required}
									<span class="text-destructive">*</span>
								{/if}
							</label>
							{#if field.valueType === 'html'}
								<textarea
									id={field.placeholderKey + suffix}
									bind:value={manualInputs[field.placeholderKey]}
									placeholder={`Masukkan HTML atau teks...`}
									class="min-h-15 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									required={field.required}
								></textarea>
							{:else}
								<input
									type="text"
									id={field.placeholderKey + suffix}
									bind:value={manualInputs[field.placeholderKey]}
									placeholder={`Masukkan ${field.label.toLowerCase()}...`}
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									required={field.required}
								/>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<div class="flex flex-col gap-2 sm:flex-row">
				<!-- Tombol Generate Ulang -->
				<Button
					class="flex-1"
					disabled={remainingSeconds > 0 || isGenerating}
					onclick={handleGenerate}
				>
					{#if isGenerating}
						<Loader2 class="h-4 w-4 animate-spin" />
						Generating...
					{:else if remainingSeconds > 0}
						<Clock class="h-4 w-4" />
						{formatCooldown(remainingSeconds)}
					{:else}
						<RefreshCw class="h-4 w-4" />
						{data.lastGeneration ? 'Generate Ulang' : 'Generate'}
					{/if}
				</Button>

				<!-- Tombol Download DOCX -->
				{#if data.lastGeneration?.fileName}
					<Button
						variant="outline"
						class="flex-1"
						disabled={isDownloadingDocx}
						onclick={handleDownloadDocx}
					>
						{#if isDownloadingDocx}
							<Loader2 class="h-4 w-4 animate-spin" />
							Downloading...
						{:else}
							<Download class="h-4 w-4" />
							Unduh DOCX
						{/if}
					</Button>
				{/if}

				<!-- Tombol Download PDF -->
				{#if data.lastGeneration?.pdfUrl}
					<Button
						variant="outline"
						class="flex-1"
						disabled={isDownloadingPdf}
						onclick={handleDownloadPdf}
					>
						{#if isDownloadingPdf}
							<Loader2 class="h-4 w-4 animate-spin" />
							Downloading...
						{:else}
							<Download class="h-4 w-4" />
							Unduh PDF
						{/if}
					</Button>
				{/if}
			</div>

			{#if remainingSeconds > 0}
				<p class="text-xs text-amber-600">
					Generate ulang tersedia dalam {formatCooldown(remainingSeconds)}.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
{/snippet}

<div class="flex h-full flex-col gap-6 p-6">
	<Button variant="outline" href="/admin/logbook-saya" class="w-fit md:hidden">
		<ChevronLeft />
		Kembali
	</Button>

	<!-- Header -->
	<div class="flex items-start gap-4">
		<Button
			variant="ghost"
			size="icon"
			class="hidden md:flex"
			onclick={() => goto('/admin/logbook-saya')}
		>
			<ChevronLeft class="h-5 w-5" />
		</Button>
		<div class="flex-1">
			<h1 class="text-3xl font-bold tracking-tight">{data.series.name}</h1>
			<div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
				<span class="flex items-center gap-1">
					<FlaskConical class="h-4 w-4" />
					{data.series.laboratoriumName}
				</span>
				<span>·</span>
				<span>{data.series.blockName}</span>
				<span>·</span>
				<span>{data.series.departmentName}</span>
			</div>
		</div>
	</div>

	<!-- Stats + Generate Panel -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Stat: total jadwal -->
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600"
				>
					<Calendar class="h-5 w-5" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Jadwal Dinilai</p>
					<p class="text-2xl font-bold">
						{data.stats.totalAssessed}
						<span class="text-base font-normal text-muted-foreground"
							>/ {data.stats.totalSchedules}</span
						>
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Stat: rata-rata nilai -->
		<Card.Root>
			<Card.Content class="flex items-center gap-4">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
				>
					<Award class="h-5 w-5" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Rata-rata Nilai</p>
					<p class="text-2xl font-bold">
						{data.stats.avgScore ?? '-'}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Panel Generate (Mobile) -->
		{@render generateCard('-mobile', 'md:hidden')}
	</div>

	<!-- Panel Generate (Desktop) -->
	<div class="hidden md:block">
		{@render generateCard('-desktop')}
	</div>

	<!-- Tabel Nilai per Jadwal -->
	<div class="flex flex-col gap-3">
		<h2 class="text-lg font-semibold">Rincian Penilaian</h2>

		<!-- Desktop View (Tabel tunggal dengan rowspan) -->
		<div class="hidden md:block">
			{#if data.scheduleDetails.length === 0}
				<Card.Root>
					<Card.Content class="flex flex-col items-center gap-3 py-12">
						<FileText class="h-10 w-10 text-muted-foreground" />
						<p class="text-muted-foreground">Tidak ada jadwal dalam seri ini.</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Content class="p-0">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="px-6 py-4">Jadwal</Table.Head>
									<Table.Head>Modul</Table.Head>
									<Table.Head>DPJP</Table.Head>
									<Table.Head class="text-center">Nilai</Table.Head>
									<Table.Head class="pr-6">Catatan</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.scheduleDetails as schedule (schedule.id)}
									{#if schedule.assessments.length > 0}
										{#each schedule.assessments as assessment, i (assessment.id)}
											<Table.Row class="hover:bg-slate-50/50">
												{#if i === 0}
													<Table.Cell
														rowspan={schedule.assessments.length}
														class="border-r px-6 py-4 align-top"
													>
														<div class="flex flex-col gap-1">
															<span class="font-semibold text-slate-900">{schedule.title}</span>
															<span class="text-xs text-muted-foreground">
																{formatDate(schedule.startTime)}
															</span>
															<span class="text-xs text-muted-foreground">
																{formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
															</span>
														</div>
													</Table.Cell>
												{/if}
												<Table.Cell class="px-6 py-4 font-medium"
													>{assessment.moduleName}</Table.Cell
												>
												<Table.Cell class="px-6 py-4 text-sm text-muted-foreground">
													{assessment.instructorName}
												</Table.Cell>
												<Table.Cell class="px-6 py-4 text-center">
													<span
														class="rounded-md bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-700"
													>
														{assessment.score}
													</span>
												</Table.Cell>
												<Table.Cell class="max-w-xs px-6 py-4 text-sm text-muted-foreground">
													{assessment.notes ?? '-'}
												</Table.Cell>
											</Table.Row>
										{/each}
									{:else}
										<Table.Row class="hover:bg-slate-50/50">
											<Table.Cell class="border-r px-6 py-4 align-top">
												<div class="flex flex-col gap-1">
													<span class="font-semibold text-slate-900">{schedule.title}</span>
													<span class="text-xs text-muted-foreground">
														{formatDate(schedule.startTime)}
													</span>
													<span class="text-xs text-muted-foreground">
														{formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
													</span>
												</div>
											</Table.Cell>
											<Table.Cell colspan={4} class="px-6 py-4 text-muted-foreground italic">
												Belum dinilai
											</Table.Cell>
										</Table.Row>
									{/if}
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>

		<!-- Mobile View (Card per jadwal) -->
		<div class="flex flex-col gap-3 md:hidden">
			{#each data.scheduleDetails as schedule (schedule.id)}
				<Card.Root>
					<Card.Header class="border-b">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-semibold">{schedule.title}</p>
								<p class="text-xs text-muted-foreground">
									{formatDate(schedule.startTime)} ·
									{formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
								</p>
							</div>
							{#if schedule.assessments.length > 0}
								<span class={badgeVariants({ variant: 'secondary' })}>
									{schedule.assessments.length} penilaian
								</span>
							{:else}
								<span class={badgeVariants({ variant: 'outline' })}>Belum dinilai</span>
							{/if}
						</div>
					</Card.Header>

					{#if schedule.assessments.length > 0}
						<Card.Content class="p-0">
							<Table.Root class="block">
								<Table.Body class="block">
									{#each schedule.assessments as assessment (assessment.id)}
										<Table.Row
											class="group flex flex-col border-b transition-colors last:border-0 hover:bg-slate-50/50"
										>
											<!-- Modul + Mobile expand trigger (no score badge on collapse trigger) -->
											<Table.Cell
												class="flex items-center justify-between border-b-0 p-4 whitespace-normal"
											>
												<span class="font-bold text-slate-900">{assessment.moduleName}</span>
												<Button
													variant="ghost"
													size="icon"
													class="ml-4 h-8 w-8 shrink-0"
													onclick={() =>
														(expandedItems[assessment.id] = !expandedItems[assessment.id])}
													aria-label="Expand row"
												>
													{#if expandedItems[assessment.id]}
														<ChevronUp class="h-4 w-4" />
													{:else}
														<ChevronDown class="h-4 w-4" />
													{/if}
												</Button>
											</Table.Cell>

											<!-- DPJP -->
											<Table.Cell
												class={cn(
													expandedItems[assessment.id] ? 'flex' : 'hidden',
													'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2'
												)}
											>
												<span class="text-xs font-semibold text-slate-400">DPJP</span>
												<span class="text-sm text-slate-600">{assessment.instructorName}</span>
											</Table.Cell>

											<!-- Nilai -->
											<Table.Cell
												class={cn(
													expandedItems[assessment.id] ? 'flex' : 'hidden',
													'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2'
												)}
											>
												<span class="text-xs font-semibold text-slate-400">Nilai</span>
												<span
													class="w-fit rounded-md bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-700"
												>
													{assessment.score}
												</span>
											</Table.Cell>

											<!-- Catatan -->
											<Table.Cell
												class={cn(
													expandedItems[assessment.id] ? 'flex' : 'hidden',
													'flex-col gap-1 border-b-0 bg-slate-50/50 px-4 py-2 pb-4'
												)}
											>
												<span class="text-xs font-semibold text-slate-400">Catatan</span>
												<span class="text-sm text-slate-600">{assessment.notes ?? '-'}</span>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					{/if}
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Content class="flex flex-col items-center gap-3 py-12">
						<FileText class="h-10 w-10 text-muted-foreground" />
						<p class="text-muted-foreground">Tidak ada jadwal dalam seri ini.</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>
</div>

<NotificationDialog
	bind:open={dialogOpen}
	type={dialogType}
	title={dialogTitle}
	description={dialogDescription}
	onAction={() => (dialogOpen = false)}
/>
