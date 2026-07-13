<script lang="ts">
	let { data } = $props();
</script>

<main class="container">
	<header>
		<h1>Daftar Pengguna</h1>
		<p>Contoh fetching dengan skeleton loading & delay 2 detik.</p>
	</header>

	{#await data.usersPromise}
		<div class="user-grid">
			{#each Array(6) as _, i (i)}
				<div class="user-card skeleton-card">
					<div class="skeleton skeleton-avatar"></div>
					<div class="skeleton-content">
						<div class="skeleton skeleton-title"></div>
						<div class="skeleton skeleton-subtitle"></div>
					</div>
				</div>
			{/each}
		</div>
	{:then users}
		<div class="user-grid">
			{#each users as user (user.id)}
				<a href="/testing-spa/{user.id}" class="user-card-link">
					<div class="user-card">
						<div class="avatar">{user.name.charAt(0)}</div>
						<div class="content">
							<h3>{user.name}</h3>
							<p class="email">{user.email}</p>
							<span class="city">{user.address.city}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:catch error}
		<div class="error-box">
			<p>Ups! Terjadi kesalahan:</p>
			<code>{error.message}</code>
		</div>
	{/await}
</main>

<style>
	/* --- Layout Dasar --- */
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}
	header {
		margin-bottom: 2rem;
	}
	h1 {
		margin: 0;
		color: #333;
	}
	header p {
		color: #666;
		margin-top: 0.5rem;
	}

	/* --- Grid Layout --- */
	.user-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	/* --- Desain Kartu Asli --- */
	.user-card-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}
	.user-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}
	.user-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: #007bff;
	}
	.avatar {
		width: 50px;
		height: 50px;
		background-color: #007bff;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: bold;
		flex-shrink: 0;
	}
	.content h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
		color: #222;
	}
	.email {
		margin: 0;
		font-size: 0.9rem;
		color: #666;
	}
	.city {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.8rem;
		background: #f0f0f0;
		padding: 2px 8px;
		border-radius: 12px;
		color: #555;
	}

	/* --- Desain Kartu Skeleton --- */
	.skeleton-card {
		background: #fafafa;
		border-color: #eee;
	}
	.skeleton-content {
		flex-grow: 1;
	}

	/* Base class untuk elemen skeleton */
	.skeleton {
		background: #e0e0e0;
		border-radius: 4px;
		/* Animasi berkedip (pulsing) */
		animation: pulse 1.5s ease-in-out infinite;
	}

	/* Ukuran spesifik tiap elemen skeleton */
	.skeleton-avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.skeleton-title {
		height: 18px;
		width: 70%;
		margin-bottom: 8px;
	}
	.skeleton-subtitle {
		height: 14px;
		width: 90%;
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			opacity: 1;
		}
	}

	/* --- Error Box --- */
	.error-box {
		background: #fee2e2;
		color: #991b1b;
		padding: 1.5rem;
		border-radius: 8px;
		border: 1px solid #f87171;
	}
</style>
