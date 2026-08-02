import { error, fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { discoveries, films, syncState } from '$lib/server/db/schema';
import { slugify } from '$lib/server/slug';
import type { Actions, PageServerLoad } from './$types';

/**
 * Owner-only.
 *
 * Cloudflare Access authenticates everyone on the allow list identically, so
 * anyone you add as a friend would otherwise reach this page. The `isOwner`
 * check (JWT `sub` against the OWNER_SUB secret) is what keeps it yours.
 */
function requireOwner(locals: App.Locals) {
	if (!locals.user.isOwner) throw error(403, 'Not authorised');
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	requireOwner(locals);
	const db = getDb(platform);

	const pending = await db
		.select()
		.from(discoveries)
		.where(eq(discoveries.status, 'pending'))
		.orderBy(desc(discoveries.firstSeenAt));

	const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(films);

	const sagas = await db
		.selectDistinct({ saga: films.saga })
		.from(films)
		.orderBy(films.saga);

	// The sync runs outside this app, so a stopped scheduler is otherwise
	// invisible — release dates would just quietly go stale.
	const [state] = await db.select().from(syncState).where(eq(syncState.id, 1));

	return {
		pending,
		totalFilms: Number(total),
		sagas: sagas.map((s) => s.saga),
		lastSyncAt: state?.lastRunAt ?? null,
		lastSyncReport: state?.lastReport ?? null
	};
};

export const actions: Actions = {
	/**
	 * Promotes a discovery into the catalogue.
	 *
	 * Phase and saga come from this form because TMDB has no concept of either
	 * — they are editorial, and the sync must never set or change them. The
	 * description is deliberately left null: the next sync run generates one in
	 * the established voice.
	 */
	add: async ({ request, locals, platform }) => {
		requireOwner(locals);
		const db = getDb(platform);
		const form = await request.formData();

		const tmdbId = Number(form.get('tmdbId'));
		const phase = Number(form.get('phase'));
		const saga = String(form.get('saga') ?? '').trim();

		if (!Number.isInteger(tmdbId)) return fail(400, { message: 'Bad discovery id' });
		if (!Number.isInteger(phase) || phase < 1) return fail(400, { message: 'Phase is required' });
		if (!saga) return fail(400, { message: 'Saga is required' });

		const [discovery] = await db
			.select()
			.from(discoveries)
			.where(eq(discoveries.tmdbId, tmdbId));

		if (!discovery) return fail(404, { message: 'Discovery not found' });
		if (!discovery.releaseDate) {
			return fail(400, {
				message: `${discovery.title} has no release date on TMDB yet — it can't be ordered without one.`
			});
		}

		// Slug collisions are possible (a remake, a re-release). Suffix rather
		// than fail, since the id is internal and never displayed.
		const base = slugify(discovery.title);
		let id = base;
		for (let n = 2; ; n++) {
			const [clash] = await db.select({ id: films.id }).from(films).where(eq(films.id, id));
			if (!clash) break;
			id = `${base}${n}`;
		}

		await db.insert(films).values({
			id,
			tmdbId: discovery.tmdbId,
			mediaType: discovery.mediaType,
			title: discovery.title,
			releaseDate: discovery.releaseDate,
			posterPath: discovery.posterPath,
			description: null,
			descriptionSource: null,
			saga,
			phase
		});

		await db
			.update(discoveries)
			.set({ status: 'added' })
			.where(eq(discoveries.tmdbId, tmdbId));

		return { ok: true, message: `Added ${discovery.title}. A description will be written on the next sync.` };
	},

	ignore: async ({ request, locals, platform }) => {
		requireOwner(locals);
		const db = getDb(platform);
		const form = await request.formData();
		const tmdbId = Number(form.get('tmdbId'));

		if (!Number.isInteger(tmdbId)) return fail(400, { message: 'Bad discovery id' });

		await db
			.update(discoveries)
			.set({ status: 'ignored' })
			.where(eq(discoveries.tmdbId, tmdbId));

		return { ok: true };
	}
};
