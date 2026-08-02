import { describe, expect, it } from 'vitest';
import { createTestDb } from './db/testing';
import { watches } from './db/schema';
import {
	countFilms,
	createFilm,
	currentPhase,
	deleteFilm,
	getFilm,
	listFilms,
	parseFilmForm,
	updateFilm
} from './films';

function formOf(fields: Record<string, string>): FormData {
	const form = new FormData();
	for (const [k, v] of Object.entries(fields)) form.set(k, v);
	return form;
}

const VALID = {
	title: 'Avengers: Secret Wars',
	releaseDate: '2027-12-17',
	description: 'Everyone, everywhere, all at once, again.',
	saga: 'The Multiverse Saga',
	phase: '6'
};

describe('parseFilmForm', () => {
	it('accepts a complete form, trimming as it goes', () => {
		const result = parseFilmForm(formOf({ ...VALID, title: '  Secret Wars  ' }));
		expect(result).toEqual({
			ok: true,
			value: {
				title: 'Secret Wars',
				releaseDate: '2027-12-17',
				description: 'Everyone, everywhere, all at once, again.',
				saga: 'The Multiverse Saga',
				phase: 6
			}
		});
	});

	it.each([
		['title', 'Title is required.'],
		['releaseDate', 'Release date is required.'],
		['description', 'Description is required.'],
		['saga', 'Saga is required.']
	])('rejects a blank %s', (field, message) => {
		expect(parseFilmForm(formOf({ ...VALID, [field]: '   ' }))).toEqual({ ok: false, message });
	});

	it('rejects a date that is not YYYY-MM-DD', () => {
		expect(parseFilmForm(formOf({ ...VALID, releaseDate: '17/12/2027' }))).toMatchObject({
			ok: false,
			message: 'Release date must be YYYY-MM-DD.'
		});
	});

	// release_date is the sort key, so a date that does not exist sorts
	// somewhere no one can reason about.
	it('rejects a well-formed date that does not exist', () => {
		expect(parseFilmForm(formOf({ ...VALID, releaseDate: '2027-02-31' }))).toMatchObject({
			ok: false,
			message: 'There is no such date as 2027-02-31.'
		});
	});

	it.each(['0', '-1', '1.5', '', 'six'])('rejects phase %o', (phase) => {
		expect(parseFilmForm(formOf({ ...VALID, phase }))).toMatchObject({ ok: false });
	});

	it('accepts a phase past the last one with a colour', () => {
		// The form warns about this; it is not the parser's job to block it.
		expect(parseFilmForm(formOf({ ...VALID, phase: '7' }))).toMatchObject({
			ok: true,
			value: { phase: 7 }
		});
	});
});

describe('the catalogue', () => {
	const input = {
		title: 'Avengers: Secret Wars',
		releaseDate: '2027-12-17',
		description: 'Everyone, everywhere, all at once, again.',
		saga: 'The Multiverse Saga',
		phase: 6
	};

	it('round-trips a new film', async () => {
		const { db, close } = createTestDb();
		try {
			const created = await createFilm(db, input);
			expect(created).toMatchObject(input);
			expect(await getFilm(db, created.id)).toMatchObject(input);
			expect(await countFilms(db)).toBe(41);
		} finally {
			close();
		}
	});

	it('defaults media_type without being asked', async () => {
		const { db, close } = createTestDb();
		try {
			expect((await createFilm(db, input)).mediaType).toBe('movie');
		} finally {
			close();
		}
	});

	it('sorts a new film into release order, not insertion order', async () => {
		const { db, close } = createTestDb();
		try {
			await createFilm(db, { ...input, title: 'Interquel', releaseDate: '2013-06-01' });
			const titles = (await listFilms(db)).map((f) => f.title);
			expect(titles[titles.indexOf('Interquel') - 1]).toBe('Iron Man 3');
		} finally {
			close();
		}
	});

	/**
	 * The whole reason Edit exists: nothing refreshes release dates any more,
	 * so this is the only path that keeps the page correct when Marvel moves a
	 * film.
	 */
	it('moves a release date', async () => {
		const { db, close } = createTestDb();
		try {
			const before = await getFilm(db, 40);
			const after = await updateFilm(db, 40, {
				title: before!.title,
				description: before!.description,
				saga: before!.saga,
				phase: before!.phase,
				releaseDate: '2028-05-05'
			});

			expect(after?.releaseDate).toBe('2028-05-05');
			expect(after?.title).toBe(before!.title);
			expect(after?.updatedAt).not.toBe(before!.updatedAt);
			expect((await listFilms(db)).at(-1)?.id).toBe(40);
		} finally {
			close();
		}
	});

	it('returns undefined rather than throwing for an id that is gone', async () => {
		const { db, close } = createTestDb();
		try {
			expect(await getFilm(db, 9999)).toBeUndefined();
			expect(await updateFilm(db, 9999, input)).toBeUndefined();
			expect(await deleteFilm(db, 9999)).toBeUndefined();
		} finally {
			close();
		}
	});

	it('hands back the deleted row so the caller can name it', async () => {
		const { db, close } = createTestDb();
		try {
			const deleted = await deleteFilm(db, 1);
			expect(deleted?.title).toBe('Iron Man');
			expect(await getFilm(db, 1)).toBeUndefined();
			expect(await countFilms(db)).toBe(39);
		} finally {
			close();
		}
	});

	it('takes the tick with it', async () => {
		const { db, close } = createTestDb();
		try {
			await db.insert(watches).values({ userSub: 'u', filmId: 1 });
			await deleteFilm(db, 1);
			expect(await db.select().from(watches)).toEqual([]);
		} finally {
			close();
		}
	});
});

describe('currentPhase', () => {
	it('is the highest phase and its saga', async () => {
		const { db, close } = createTestDb();
		try {
			expect(await currentPhase(db)).toEqual({ phase: 6, saga: 'The Multiverse Saga' });
		} finally {
			close();
		}
	});

	it('follows a newly created phase', async () => {
		const { db, close } = createTestDb();
		try {
			await createFilm(db, {
				title: 'Something Later',
				releaseDate: '2029-01-01',
				description: 'A film in a phase that did not exist.',
				saga: 'The Next Saga',
				phase: 7
			});
			expect(await currentPhase(db)).toEqual({ phase: 7, saga: 'The Next Saga' });
		} finally {
			close();
		}
	});

	it('is null on an empty catalogue', async () => {
		const { db, raw, close } = createTestDb();
		try {
			raw.exec('DELETE FROM films');
			expect(await currentPhase(db)).toBeNull();
		} finally {
			close();
		}
	});
});
