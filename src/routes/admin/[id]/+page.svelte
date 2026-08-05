<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import PhaseField from '$lib/PhaseField.svelte';
	import HamburgerMenu from '$lib/HamburgerMenu.svelte';

	let { data, form } = $props();

	// The film as loaded is where the fields start. `untrack` because a reload
	// after saving must not overwrite what is in the form.
	let phase = $state(untrack(() => data.film.phase));
	let saga = $state(untrack(() => data.film.saga));
</script>

<svelte:head>
	<title>{data.film.title} · Admin</title>
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
				href="/admin"
				class="flex-none font-mono text-xs tracking-button text-muted uppercase hover:text-ink"
			>
				← Admin
			</a>
			<HamburgerMenu />
		</div>
	</div>

	<div class="mx-auto max-w-3xl px-5 pt-8">
		<h1 class="font-display text-4xl font-extrabold tracking-title uppercase">
			{data.film.title}
		</h1>

		{#if form?.message}
			<p
				class="mt-4 rounded-xs border px-3 py-2 font-mono text-xs {form.ok
					? 'border-phase-5 text-phase-5'
					: 'border-phase-1 text-phase-1'}"
				role="status"
			>
				{form.message}
			</p>
		{/if}

		<!--
			`reset: false` because a reset would empty this form rather than restore
			it. form.reset() puts inputs back to their HTML value attribute, which
			the bound saga input and the description textarea do not have — they
			carry their value as a property. Editing is also a repeat activity:
			after saving you want to still be looking at what you saved.
		-->
		<form
			method="POST"
			action="?/update"
			use:enhance={() =>
				async ({ update }) => {
					await update({ reset: false });
				}}
		>
			<label class="mt-6 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Title</span>
				<input
					name="title"
					value={data.film.title}
					required
					maxlength="200"
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				/>
			</label>

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Release date</span>
				<input
					name="releaseDate"
					type="date"
					value={data.film.releaseDate}
					required
					class="w-48 rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				/>
				<span class="font-mono text-2xs tracking-note text-muted">
					The one field nothing else corrects. Marvel moves these.
				</span>
			</label>

			<PhaseField sagaByPhase={data.sagaByPhase} bind:phase bind:saga />

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Description</span>
				<textarea
					name="description"
					required
					rows="2"
					maxlength="300"
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					>{data.film.description}</textarea
				>
			</label>

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Poster URL</span>
				<input
					name="posterUrl"
					type="url"
					value={data.film.posterUrl ?? ''}
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
				/>
			</label>

			<div class="mt-4 flex gap-3">
				<label class="flex flex-1 flex-col gap-1">
					<span class="font-mono text-2xs tracking-label text-muted uppercase">
						Duration (min)
					</span>
					<input
						name="duration"
						type="number"
						min="1"
						value={data.film.duration}
						required
						class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					/>
				</label>

				<label class="flex flex-1 flex-col gap-1">
					<span class="font-mono text-2xs tracking-label text-muted uppercase">Director</span>
					<input
						name="director"
						value={data.film.director}
						required
						class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					/>
				</label>

				<label class="flex flex-1 flex-col gap-1">
					<span class="font-mono text-2xs tracking-label text-muted uppercase">
						Post-credits scenes
					</span>
					<input
						name="postCreditsScenes"
						type="number"
						min="0"
						value={data.film.postCreditsScenes}
						required
						class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					/>
				</label>
			</div>

			<label class="mt-4 flex flex-col gap-1">
				<span class="font-mono text-2xs tracking-label text-muted uppercase">Recap</span>
				<textarea
					name="recap"
					required
					rows="4"
					maxlength="1500"
					class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					>{data.film.recap}</textarea
				>
			</label>

			<button
				type="submit"
				class="mt-5 rounded-xs border border-ink bg-ink px-3 py-2 font-mono text-xs tracking-button text-paper uppercase hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			>
				Save
			</button>
		</form>

		<!--
			A native disclosure rather than confirm() or a Svelte-state reveal, so
			the guard survives with JavaScript off — the same standard the rest of
			the app's forms hold themselves to.
		-->
		<details class="group mt-12 border-t border-rule pt-4">
			<summary
				class="inline-block cursor-pointer rounded-xs border border-rule px-3 py-2 font-mono text-xs tracking-button text-muted uppercase select-none hover:border-phase-1 hover:text-phase-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
			>
				Delete
			</summary>

			<div class="mt-3">
				<p
					class="rounded-xs border border-phase-1 px-3 py-2 font-mono text-xs leading-relaxed text-phase-1"
				>
					Delete <b class="font-semibold">{data.film.title}</b> permanently? This also removes your
					tick for it.
				</p>

				<form method="POST" action="?/delete" use:enhance class="mt-3">
					<button
						type="submit"
						class="rounded-xs border border-phase-1 bg-transparent px-3 py-2 font-mono text-xs tracking-button text-phase-1 uppercase hover:bg-phase-1 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
					>
						Delete permanently
					</button>
				</form>
			</div>
		</details>
	</div>
</div>
