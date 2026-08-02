/**
 * An in-memory database that runs the real migrations, for tests.
 *
 * Production is D1; this is `node:sqlite` behind Drizzle's sqlite-proxy
 * driver. The gap is smaller than it looks — both are SQLite, and Drizzle
 * emits the same SQL against either — and what it buys is a test suite with
 * no Miniflare, no native dependency and no worker pool.
 *
 * Foreign keys are enabled, which D1 also does and `:memory:` does not by
 * default. That matters: the whole hazard in migration 0003 is a cascade from
 * `watches.film_id`, and a harness with foreign keys off would prove nothing
 * about it.
 *
 * Only imported by tests. It lives under src/ rather than a test folder so it
 * shares the app's `$lib` resolution and its schema types.
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

/** Statement text as Drizzle's proxy driver hands it over, minus the marker. */
function splitStatements(sql: string): string[] {
	return sql
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * The migration files, in the order `wrangler d1 migrations apply` runs them.
 *
 * That is the sorted directory listing — *not* drizzle's `_journal.json`.
 * The journal has no entry for the hand-written `0001_seed_films.sql`, so
 * reading it would silently skip the seed and test a schema no deployment has
 * ever had. The journal is drizzle-kit's bookkeeping for generating the next
 * migration; it is not what applies them.
 */
export function migrationFiles(): string[] {
	return readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort();
}

/**
 * The numeric prefixes, for the collision check.
 *
 * Because the journal does not know about `0001`, drizzle-kit has generated a
 * migration with a number already on disk before. Two files sharing a prefix
 * is not an error to wrangler — it applies both — so nothing else catches it.
 */
export function migrationPrefixes(): string[] {
	return migrationFiles().map((f) => f.slice(0, 4));
}

export interface TestDb {
	db: ReturnType<typeof drizzle<typeof schema>>;
	/** The underlying handle, for assertions Drizzle's types get in the way of. */
	raw: DatabaseSync;
	close(): void;
}

/**
 * A fresh database with every journalled migration applied.
 *
 * @param upTo apply only the first N migrations, for asserting on an
 *             intermediate schema.
 */
export function createTestDb(upTo?: number): TestDb {
	const raw = new DatabaseSync(':memory:');
	raw.exec('PRAGMA foreign_keys = ON;');

	const files = migrationFiles().slice(0, upTo ?? Infinity);
	for (const file of files) {
		const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
		for (const statement of splitStatements(sql)) raw.exec(statement);
	}

	const db = drizzle<typeof schema>(
		async (sql, params, method) => {
			const stmt = raw.prepare(sql);
			if (method === 'run') {
				stmt.run(...(params as never[]));
				return { rows: [] };
			}
			// sqlite-proxy wants positional arrays, not the objects
			// node:sqlite returns.
			const raws = stmt.all(...(params as never[])).map((r) => Object.values(r));
			return { rows: method === 'get' ? (raws[0] ?? []) : raws };
		},
		{ schema }
	);

	return { db, raw, close: () => raw.close() };
}
