<script lang="ts">
	let { data } = $props();
</script>

<main class="container">
	<a href="/testing-spa" class="back-link">← Kembali ke Daftar</a>

	{#await data.userPromise}
		<div class="detail-card skeleton-card">
			<div class="skeleton-header">
				<div class="skeleton skeleton-avatar-large"></div>
				<div class="skeleton-title-box">
					<div class="skeleton skeleton-h1"></div>
					<div class="skeleton skeleton-text-short"></div>
				</div>
			</div>
			<div class="skeleton-body">
				<div class="skeleton-section">
					<div class="skeleton skeleton-h2"></div>
					<div class="skeleton skeleton-text"></div>
					<div class="skeleton skeleton-text"></div>
				</div>
				<div class="skeleton-section">
					<div class="skeleton skeleton-h2"></div>
					<div class="skeleton skeleton-text"></div>
				</div>
			</div>
		</div>
	{:then user}
		<div class="detail-card">
			<header class="detail-header">
				<div class="avatar-large">{user.name.charAt(0)}</div>
				<div class="title-box">
					<h1>{user.name}</h1>
					<p class="username">@{user.username}</p>
				</div>
			</header>

			<div class="detail-grid">
				<section class="info-section">
					<h2>Kontak</h2>
					<p><strong>Email:</strong> {user.email}</p>
					<p><strong>Telepon:</strong> {user.phone}</p>
					<p><strong>Website:</strong> <a href="https://{user.website}" target="_blank">{user.website}</a></p>
				</section>

				<section class="info-section">
					<h2>Alamat</h2>
					<p>{user.address.street}, {user.address.suite}</p>
					<p>{user.address.city}, {user.address.zipcode}</p>
				</section>

				<section class="info-section full-width">
					<h2>Perusahaan</h2>
					<p><strong>Nama:</strong> {user.company.name}</p>
					<p class="catch-phrase">"{user.company.catchPhrase}"</p>
				</section>
			</div>
		</div>
	{:catch error}
		<div class="error-box">
			<p>Ups! Gagal memuat data:</p>
			<code>{error.message}</code>
		</div>
	{/await}
</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1.5rem;
		color: #007bff;
		text-decoration: none;
		font-weight: 500;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.detail-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 16px;
		padding: 2.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.detail-header {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 2.5rem;
		border-bottom: 1px solid #eee;
		padding-bottom: 2rem;
	}

	.avatar-large {
		width: 100px;
		height: 100px;
		background: #007bff;
		color: white;
		font-size: 3rem;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.title-box h1 {
		margin: 0;
		font-size: 2rem;
		color: #1a1a1a;
	}

	.username {
		margin: 0.5rem 0 0 0;
		color: #666;
		font-size: 1.1rem;
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.info-section h2 {
		font-size: 1.25rem;
		margin-top: 0;
		margin-bottom: 1rem;
		color: #333;
		border-bottom: 2px solid #f0f0f0;
		padding-bottom: 0.5rem;
	}

	.info-section p {
		margin: 0.5rem 0;
		line-height: 1.6;
		color: #444;
	}

	.full-width {
		grid-column: span 2;
	}

	.catch-phrase {
		font-style: italic;
		color: #555;
	}

	/* --- Skeleton --- */
	.skeleton {
		background: #e0e0e0;
		border-radius: 4px;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.skeleton-header {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.skeleton-avatar-large {
		width: 100px;
		height: 100px;
		border-radius: 50%;
	}

	.skeleton-h1 {
		height: 32px;
		width: 250px;
		margin-bottom: 12px;
	}

	.skeleton-h2 {
		height: 24px;
		width: 150px;
		margin-bottom: 15px;
	}

	.skeleton-text {
		height: 16px;
		width: 100%;
		margin-bottom: 10px;
	}

	.skeleton-text-short {
		height: 16px;
		width: 120px;
	}

	.skeleton-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	@keyframes pulse {
		0% { opacity: 1; }
		50% { opacity: 0.4; }
		100% { opacity: 1; }
	}

	.error-box {
		background: #fee2e2;
		color: #991b1b;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #f87171;
	}

	@media (max-width: 600px) {
		.detail-grid, .skeleton-body {
			grid-template-columns: 1fr;
		}
		.full-width {
			grid-column: span 1;
		}
		.detail-header, .skeleton-header {
			flex-direction: column;
			text-align: center;
			gap: 1rem;
		}
	}
</style>
