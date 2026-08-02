/**
 * The highest phase with a colour token.
 *
 * Phase colours are design tokens in `app.css`, not database values — see the
 * `@theme static` block there and the note in the README about why it must be
 * `static`. A film in a phase beyond this renders with no colour of its own:
 * `var(--color-phase-7)` resolves to nothing and the row inherits ink, which
 * looks almost right and is therefore worse than looking wrong.
 *
 * The admin form uses this to say so out loud rather than let it happen
 * quietly. When Marvel announces Phase 7: add `--color-phase-7` to `app.css`
 * and bump this number.
 */
export const MAX_COLOURED_PHASE = 6;

/** Design token reference for a phase, or null when there is no token. */
export function phaseColor(phase: number): string | null {
	return phase <= MAX_COLOURED_PHASE ? `var(--color-phase-${phase})` : null;
}
