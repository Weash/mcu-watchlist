<script lang="ts">
	import HamburgerMenu from '$lib/HamburgerMenu.svelte';
	import { phaseColor } from '$lib/phases';

	let { data } = $props();

	const dateFormatter = new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});

	const fmt = (iso: string) => dateFormatter.format(new Date(`${iso}T00:00:00Z`));

	// Whatever /admin/new or a delete redirected back with. One at a time —
	// nothing can add and delete in the same round trip.
	const notice = $derived(
		data.added ? `Added ${data.added}.` : data.deleted ? `Deleted ${data.deleted}.` : null
	);
</script>

<svelte:head>
	<title>Admin · MCU watchlist</title>
</svelte:head>

<div class="pb-16">
	<div class="sticky top-0 z-20 border-b border-rule bg-paper">
		<div class="mx-auto flex max-w-3xl items-center gap-2.5 px-5 pt-3.5 pb-2.5">
			<svg viewBox="0 0 512 512" class="size-[26px] flex-none rounded-[7px]" aria-hidden="true">
				<rect width="512" height="512" rx="112" fill="var(--color-ink)" />
				<circle cx="133" cy="189" r="42" fill="var(--color-phase-1)" />
				<circle cx="256" cy="189" r="42" fill="var(--color-phase-2)" />
				<circle cx="379" cy="189" r="42" fill="var(--color-phase-3)" />
				<circle cx="133" cy="325" r="42" fill="var(--color-phase-4)" />
				<circle cx="256" cy="325" r="42" fill="var(--color-phase-5)" />
				<circle
					cx="379"
					cy="325"
					r="40"
					fill="none"
					stroke="var(--color-phase-6)"
					stroke-width="9"
					stroke-dasharray="10 9.5"
					stroke-linecap="round"
				/>
			</svg>
			<div class="min-w-0 flex-1 truncate font-mono text-2xs tracking-label text-muted uppercase">
				MCU watchlist · Admin
			</div>
			<a
				href="/"
				class="flex-none font-mono text-xs tracking-button text-muted uppercase hover:text-ink"
			>
				← Watchlist
			</a>
			<HamburgerMenu />
		</div>
	</div>

	<div class="mx-auto max-w-3xl px-5 pt-8">
		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<div>
				<h1 class="font-display text-4xl font-extrabold tracking-title uppercase">Admin</h1>

				<p class="mt-2 font-mono text-2xs tracking-label text-muted uppercase">
					{data.films.length} films
				</p>
			</div>

			<a
				href="/admin/new"
				class="rounded-xs border border-ink bg-ink px-3 py-2 font-mono text-xs tracking-button text-paper uppercase hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			>
				+ Add a film
			</a>
		</div>

		{#if notice}
			<p
				class="mt-6 rounded-xs border border-rule px-3 py-2 font-mono text-xs text-muted"
				role="status"
			>
				{notice}
			</p>
		{/if}

		<h2
			class="mt-8 border-b-2 border-ink pb-1.5 font-mono text-2xs tracking-label text-muted uppercase"
		>
			Catalogue
		</h2>

		<ul class="divide-y divide-rule">
			{#each data.films as film (film.id)}
				<li>
					<a
						href="/admin/{film.id}"
						class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 pr-1 hover:bg-rule/30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-phase-3"
					>
						<span
							class="font-display text-lg leading-none font-extrabold"
							style:color={phaseColor(film.phase)}
						>
							{String(film.phase).padStart(2, '0')}
						</span>
						<span class="font-display text-lg leading-rowtitle font-bold uppercase">
							{film.title}
						</span>
						<span class="ml-auto font-mono text-xs text-muted">
							{fmt(film.releaseDate)}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</div>
