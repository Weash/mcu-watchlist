import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, migrationFiles, migrationPrefixes } from './testing';
import { films, watches } from './schema';

/**
 * Migration 0003 rebuilds `films`, and `watches.film_id` cascades on delete.
 * That combination is the one thing in this repo that can destroy data, so it
 * gets asserted rather than assumed.
 */
describe('migrations', () => {
	it('replay from empty with foreign keys on', () => {
		const { raw, close } = createTestDb();
		try {
			expect(raw.prepare('PRAGMA foreign_keys').get()).toMatchObject({ foreign_keys: 1 });
			expect(raw.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
		} finally {
			close();
		}
	});

	it('leaves only the two tables the app still uses', () => {
		const { raw, close } = createTestDb();
		try {
			const names = raw
				.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
				.all()
				.map((r) => (r as { name: string }).name)
				.filter((n) => !n.startsWith('sqlite_'));

			expect(names).toEqual(['films', 'watches']);
		} finally {
			close();
		}
	});

	it('carries all 40 seeded films through the rebuild', async () => {
		const { db, close } = createTestDb();
		try {
			const rows = await db.select().from(films).orderBy(films.releaseDate);
			expect(rows).toHaveLength(40);
			expect(rows[0]).toMatchObject({ title: 'Iron Man', releaseDate: '2008-05-02', phase: 1 });
			expect(rows.at(-1)?.phase).toBe(6);
		} finally {
			close();
		}
	});

	/**
	 * 0006 makes these five columns NOT NULL. If 0005's backfill missed a
	 * film, this is where it shows up — a null would fail the rebuild itself,
	 * but a wrong-but-present value would not, so this also spot-checks that
	 * every row actually has content rather than an empty string.
	 */
	it('backfilled every film with its specs before requiring them', async () => {
		const { db, close } = createTestDb();
		try {
			const rows = await db.select().from(films);
			expect(rows).toHaveLength(40);
			for (const row of rows) {
				expect(row.posterUrl.length).toBeGreaterThan(0);
				expect(row.recap.length).toBeGreaterThan(0);
				expect(row.director.length).toBeGreaterThan(0);
				expect(row.duration).toBeGreaterThan(0);
				expect(row.postCreditsScenes).toBeGreaterThanOrEqual(0);
			}
		} finally {
			close();
		}
	});

	it('reassigns ids as 1..40 in release order', async () => {
		const { db, close } = createTestDb();
		try {
			const rows = await db.select().from(films).orderBy(films.releaseDate);
			expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
		} finally {
			close();
		}
	});

	it('drops the columns only the sync wrote', () => {
		const { raw, close } = createTestDb();
		try {
			const columns = raw
				.prepare(`PRAGMA table_info('films')`)
				.all()
				.map((r) => (r as { name: string }).name);

			expect(columns).not.toContain('tmdb_id');
			expect(columns).not.toContain('poster_path');
			expect(columns).not.toContain('description_source');
		} finally {
			close();
		}
	});

	it('requires a description', () => {
		const { raw, close } = createTestDb();
		try {
			expect(() =>
				raw.exec(
					`INSERT INTO films (title, release_date, saga, phase, updated_at)
					 VALUES ('X', '2030-01-01', 'S', 6, '2026-01-01T00:00:00.000Z')`
				)
			).toThrow(/NOT NULL/i);
		} finally {
			close();
		}
	});

	/** 0006 makes these five columns as required as `description` already was. */
	it('requires the five film-spec columns 0006 added to NOT NULL', () => {
		const { raw, close } = createTestDb();
		try {
			expect(() =>
				raw.exec(
					`INSERT INTO films (title, release_date, description, saga, phase, updated_at)
					 VALUES ('X', '2030-01-01', 'D', 'S', 6, '2026-01-01T00:00:00.000Z')`
				)
			).toThrow(/NOT NULL/i);
		} finally {
			close();
		}
	});

	it('leaves a rating optional', async () => {
		const { db, close } = createTestDb();
		try {
			await db.insert(watches).values({ userSub: 'u', filmId: 1 });
			const [row] = await db.select().from(watches);
			expect(row.rating).toBeNull();
		} finally {
			close();
		}
	});

	it('cascades a tick away when its film is deleted', async () => {
		const { db, close } = createTestDb();
		try {
			await db.insert(watches).values({ userSub: 'u', filmId: 1 });
			await db.delete(films).where(sql`id = 1`);
			expect(await db.select().from(watches)).toEqual([]);
		} finally {
			close();
		}
	});

	it('refuses a tick for a film that does not exist', async () => {
		const { db, close } = createTestDb();
		try {
			// Drizzle wraps driver errors, so the constraint name is on the cause.
			const err = await db
				.insert(watches)
				.values({ userSub: 'u', filmId: 9999 })
				.then(() => null)
				.catch((e: Error) => e);

			expect(err).toBeInstanceOf(Error);
			expect((err as Error & { cause?: Error }).cause?.message).toMatch(/FOREIGN KEY/i);
		} finally {
			close();
		}
	});

	it('has no two migrations sharing a number', () => {
		const prefixes = migrationPrefixes();
		expect(prefixes).toEqual([...new Set(prefixes)]);
	});

	it('applies the hand-written seed, which the journal does not list', () => {
		const journal = JSON.parse(
			readFileSync(join(process.cwd(), 'drizzle/meta/_journal.json'), 'utf8')
		) as { entries: { tag: string }[] };

		expect(journal.entries.map((e) => e.tag)).not.toContain('0001_seed_films');
		expect(migrationFiles()).toContain('0001_seed_films.sql');
	});
});
