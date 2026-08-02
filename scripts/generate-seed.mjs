/**
 * Generates drizzle/0001_seed_films.sql from the canonical film list.
 *
 * This is where the 40 descriptions come from — they are the originals from the
 * design and the voice of the page. Release dates are US theatrical, sourced
 * from Wikipedia's List of Marvel Cinematic Universe films.
 *
 * Run:  node scripts/generate-seed.mjs
 *
 * WHAT THIS IS NOW. The catalogue has been hand-managed through /admin since
 * migration 0003, so this script is provenance rather than a tool you reach
 * for: the live data is in D1 and edited there. It still emits valid SQL, and
 * a from-scratch replay still works, because 0001 runs against 0000's schema
 * and 0003 converts afterwards — text ids, description_source and all. Do not
 * "modernise" it to match the current schema; it would then be wrong in
 * sequence.
 *
 * NOTE ON NUMBERING: this is a hand-written data migration, so drizzle-kit's
 * journal does not know it exists and will happily generate a schema migration
 * with the same number. That has happened once. The journal is consistent
 * today, but check drizzle/ for a filename collision after any renumbering —
 * and note that wrangler applies the sorted directory listing, not the
 * journal, which is the only reason this file runs at all.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const INFINITY = 'The Infinity Saga';
const MULTIVERSE = 'The Multiverse Saga';

/** [id, title, releaseDate, phase, saga, description] */
const FILMS = [
	// Phase 1
	['ironman', 'Iron Man', '2008-05-02', 1, INFINITY, 'Tony Stark builds the first suit in a cave, then tells the world who he is.'],
	['hulk', 'The Incredible Hulk', '2008-06-13', 1, INFINITY, 'Banner hides out in Brazil while the army hunts him; ends in a Harlem street brawl.'],
	['ironman2', 'Iron Man 2', '2010-05-07', 1, INFINITY, "Whiplash and his electric whips, Justin Hammer, and Black Widow's first appearance."],
	['thor', 'Thor', '2011-05-06', 1, INFINITY, 'A banished Asgardian prince learns humility in a small New Mexico desert town.'],
	['cap1', 'Captain America: The First Avenger', '2011-07-22', 1, INFINITY, 'WWII origin story: skinny Steve, the Red Skull, and a plane going into the ice.'],
	['avengers', 'The Avengers', '2012-05-04', 1, INFINITY, 'Loki opens a portal over New York and the team assembles for the first time.'],

	// Phase 2
	['ironman3', 'Iron Man 3', '2013-05-03', 2, INFINITY, 'Post-New York panic attacks, the Mandarin twist, and the Malibu house in the sea.'],
	['darkworld', 'Thor: The Dark World', '2013-11-08', 2, INFINITY, 'Malekith wants the Aether; the finale is a portal fight through Greenwich.'],
	['wintersoldier', 'Captain America: The Winter Soldier', '2014-04-04', 2, INFINITY, 'S.H.I.E.L.D. turns out to be Hydra, and Bucky comes back as a masked assassin.'],
	['gotg', 'Guardians of the Galaxy', '2014-08-01', 2, INFINITY, "Star-Lord's mixtape, a talking raccoon and a tree, and Ronan on Xandar."],
	['ultron', 'Avengers: Age of Ultron', '2015-05-01', 2, INFINITY, "Tony's peacekeeping AI goes rogue and lifts the city of Sokovia into the sky."],
	['antman', 'Ant-Man', '2015-07-17', 2, INFINITY, 'Scott Lang steals a shrinking suit; the climax happens on a Thomas the Tank Engine set.'],

	// Phase 3
	['civilwar', 'Captain America: Civil War', '2016-05-06', 3, INFINITY, 'The Accords split the team in two, leading to the airport fight in Leipzig.'],
	['strange', 'Doctor Strange', '2016-11-04', 3, INFINITY, 'An arrogant surgeon becomes a sorcerer and bargains Dormammu into submission.'],
	['gotg2', 'Guardians of the Galaxy Vol. 2', '2017-05-05', 3, INFINITY, 'Peter meets his father Ego, a living planet, and Yondu gets a Ravager funeral.'],
	['homecoming', 'Spider-Man: Homecoming', '2017-07-07', 3, INFINITY, "High-school Peter takes on the Vulture, who turns out to be his date's dad."],
	['ragnarok', 'Thor: Ragnarok', '2017-11-03', 3, INFINITY, 'Hela destroys Asgard while Thor is stuck as a gladiator on Sakaar fighting Hulk.'],
	['blackpanther', 'Black Panther', '2018-02-16', 3, INFINITY, "T'Challa takes the Wakandan throne and Killmonger challenges him for it."],
	['infinitywar', 'Avengers: Infinity War', '2018-04-27', 3, INFINITY, 'Thanos collects all six stones and snaps half of everyone out of existence.'],
	['antman2', 'Ant-Man and the Wasp', '2018-07-06', 3, INFINITY, 'A rescue mission into the Quantum Realm for Janet; ends right on the snap.'],
	['captainmarvel', 'Captain Marvel', '2019-03-08', 3, INFINITY, 'A 90s prequel with Carol Danvers, shape-shifting Skrulls and a two-eyed Fury.'],
	['endgame', 'Avengers: Endgame', '2019-04-26', 3, INFINITY, "Five years later, the time heist, and Tony's sacrifice to undo the snap."],
	['farfromhome', 'Spider-Man: Far From Home', '2019-07-02', 3, INFINITY, 'School trip through Europe where Mysterio fakes monsters with drone illusions.'],

	// Phase 4
	['blackwidow', 'Black Widow', '2021-07-09', 4, MULTIVERSE, 'Natasha reunites with her fake Russian family and shuts down the Red Room.'],
	['shangchi', 'Shang-Chi and the Legend of the Ten Rings', '2021-09-03', 4, MULTIVERSE, 'The bus fight in San Francisco, then the hidden village of Ta Lo and a dragon.'],
	['eternals', 'Eternals', '2021-11-05', 4, MULTIVERSE, 'Immortals who have been on Earth for millennia stop a Celestial hatching out of it.'],
	['nowayhome', 'Spider-Man: No Way Home', '2021-12-17', 4, MULTIVERSE, 'A memory spell goes wrong and pulls in villains and Spider-Men from other universes.'],
	['multiverse', 'Doctor Strange in the Multiverse of Madness', '2022-05-06', 4, MULTIVERSE, 'Wanda hunts America Chavez across realities; the Illuminati do not last long.'],
	['loveandthunder', 'Thor: Love and Thunder', '2022-07-08', 4, MULTIVERSE, 'Gorr the God Butcher, screaming goats, and Jane Foster wielding Mjolnir.'],
	['wakandaforever', 'Black Panther: Wakanda Forever', '2022-11-11', 4, MULTIVERSE, "Wakanda grieves T'Challa while Namor rises from the underwater city of Talokan."],

	// Phase 5
	['quantumania', 'Ant-Man and the Wasp: Quantumania', '2023-02-17', 5, MULTIVERSE, 'The whole Lang family gets stuck in the Quantum Realm with Kang the Conqueror.'],
	['gotg3', 'Guardians of the Galaxy Vol. 3', '2023-05-05', 5, MULTIVERSE, "Rocket's brutal backstory, the High Evolutionary, and the crew going separate ways."],
	['marvels', 'The Marvels', '2023-11-10', 5, MULTIVERSE, 'Carol, Kamala and Monica keep swapping places whenever they use their powers.'],
	['deadpool', 'Deadpool & Wolverine', '2024-07-26', 5, MULTIVERSE, 'Wade drags a broken Wolverine variant through the TVA and into the Void.'],
	['bravenewworld', 'Captain America: Brave New World', '2025-02-14', 5, MULTIVERSE, 'Sam Wilson as Cap, and President Ross turning into the Red Hulk.'],
	['thunderbolts', 'Thunderbolts*', '2025-05-02', 5, MULTIVERSE, 'A squad of leftover antiheroes led by Yelena, up against Sentry and the Void.'],

	// Phase 6
	['ff', 'The Fantastic Four: First Steps', '2025-07-25', 6, MULTIVERSE, 'A retro-futuristic 1960s Earth defending itself from Galactus and the Silver Surfer.'],
	['brandnewday', 'Spider-Man: Brand New Day', '2026-07-31', 6, MULTIVERSE, 'Peter fights crime full-time in a world that no longer remembers who he is.'],
	['doomsday', 'Avengers: Doomsday', '2026-12-18', 6, MULTIVERSE, 'Heroes from three universes collide with Doctor Doom.'],
	['secretwars', 'Avengers: Secret Wars', '2027-12-17', 6, MULTIVERSE, 'The finale of the Multiverse Saga.']
];

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

const NOW = '2026-08-02T00:00:00.000Z';

const rows = FILMS.map(
	([id, title, date, phase, saga, description]) =>
		`\t(${q(id)}, ${q(title)}, ${q(date)}, ${phase}, ${q(saga)}, ${q(description)}, 'authored', 'movie', ${q(NOW)})`
);

const sql = `-- Seed: the 40 MCU feature films.
--
-- Descriptions are the originals from the design, and are the voice new ones
-- should be written in.
--
-- Written against the 0000 schema, which still had text ids and a
-- description_source column. Migration 0003 converts all of this. Leave it in
-- that shape — it runs before 0003, not after.
--
-- Generated by scripts/generate-seed.mjs — edit that, not this.

INSERT INTO films (id, title, release_date, phase, saga, description, description_source, media_type, updated_at) VALUES
${rows.join(',\n')};
`;

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle', '0001_seed_films.sql');
await writeFile(OUT, sql);
console.log(`Wrote ${FILMS.length} films to drizzle/0001_seed_films.sql`);
