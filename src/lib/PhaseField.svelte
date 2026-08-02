<script lang="ts">
	import { untrack } from 'svelte';
	import { MAX_COLOURED_PHASE, phaseColor } from '$lib/phases';

	/**
	 * Phase and saga, as one control.
	 *
	 * The two are not independent: no phase has ever spanned two sagas, so
	 * picking a phase determines the saga, and the saga field is a prefilled
	 * consequence rather than a second question. Typing it freehand every time
	 * is how you end up with "The Multiverse Saga " and a watchlist split into
	 * two identically titled sections.
	 *
	 * Shared by Add and Edit — the one piece of the two forms that carries
	 * state rather than being plain inputs, which is why it is a component and
	 * the surrounding fields are simply written out twice.
	 *
	 * Everything works without JavaScript: the chips are a native radio group
	 * and the saga is a text input. `+ New phase` is enhancement — with no JS
	 * you can still type a saga, you just cannot invent a phase.
	 */
	interface Props {
		/** The saga each existing phase belongs to. */
		sagaByPhase: Record<number, string>;
		/** Preselected phase — the current one on Add, the film's on Edit. */
		phase: number;
		saga: string;
	}

	let { sagaByPhase, phase = $bindable(), saga = $bindable() }: Props = $props();

	const known = $derived(Object.keys(sagaByPhase).map(Number));
	const highest = $derived(known.length ? Math.max(...known) : 0);

	/**
	 * Phases this control invented that the database has not seen yet.
	 *
	 * Seeded from the initial props deliberately — on Edit, a film already in
	 * a phase past everything else needs a chip to sit on. `untrack` says that
	 * capturing the initial value is the intent, not an oversight.
	 */
	let invented = $state<number[]>(
		untrack(() => {
			const max = Math.max(0, ...Object.keys(sagaByPhase).map(Number));
			return phase > max ? [phase] : [];
		})
	);

	const options = $derived([...new Set([...known, ...invented])].sort((a, b) => a - b));

	function choose(n: number) {
		phase = n;
		// An invented phase has no saga of its own — carry the one it follows.
		saga = sagaByPhase[n] ?? saga;
	}

	function newPhase() {
		const next = Math.max(highest, ...invented, 0) + 1;
		invented = [...invented, next];
		choose(next);
	}
</script>

<fieldset class="mt-5">
	<legend class="font-mono text-2xs tracking-label text-muted uppercase">Phase</legend>

	<div class="mt-1.5 flex flex-wrap items-center gap-2">
		{#each options as n (n)}
			{@const color = phaseColor(n)}
			<label
				class="cursor-pointer rounded-xs border-2 px-2.5 py-1 font-display text-2xl leading-none font-extrabold transition-colors
					{phase === n ? 'border-current' : 'border-rule text-muted hover:border-current'}"
				style:color={phase === n || color ? (color ?? 'var(--color-muted)') : null}
				style:background={phase === n && color ? color : null}
			>
				<input
					type="radio"
					name="phase"
					value={n}
					checked={phase === n}
					onchange={() => choose(n)}
					class="sr-only"
				/>
				<span class:text-paper={phase === n && color}>{String(n).padStart(2, '0')}</span>
			</label>
		{/each}

		<button
			type="button"
			onclick={newPhase}
			class="rounded-xs border border-rule px-2.5 py-2 font-mono text-xs tracking-button text-muted uppercase transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
		>
			+ New phase
		</button>
	</div>

	{#if phase > MAX_COLOURED_PHASE}
		<p class="mt-2 font-mono text-2xs leading-relaxed tracking-note text-phase-1">
			Phase {phase} has no colour. Add <code>--color-phase-{phase}</code> to the
			<code>@theme static</code> block in <code>src/app.css</code> and raise
			<code>MAX_COLOURED_PHASE</code> in <code>src/lib/phases.ts</code>, or it renders in ink like
			everything else.
		</p>
	{/if}

	<label class="mt-4 flex flex-col gap-1">
		<span class="font-mono text-2xs tracking-label text-muted uppercase">Saga</span>
		<input
			name="saga"
			bind:value={saga}
			required
			maxlength="80"
			class="rounded-xs border border-rule bg-transparent px-2 py-1.5 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phase-3"
		/>
		<span class="font-mono text-2xs tracking-note text-muted">
			Follows the phase. Change it only when the phase starts a new saga.
		</span>
	</label>
</fieldset>
