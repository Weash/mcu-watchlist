/**
 * Downloads the Latin subset of the three families the design uses into
 * static/fonts/ as woff2.
 *
 * Run once (or whenever the font list changes):  node scripts/fetch-fonts.mjs
 *
 * Google Fonts serves different formats based on User-Agent; a modern Chrome
 * UA gets us woff2 with unicode-range subsets. We keep only the `latin` one.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'fonts');

const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Each entry: the Google Fonts css2 query, and how to name what comes back. */
const FAMILIES = [
	{
		query: 'family=Big+Shoulders+Display:wght@500..800',
		files: ['big-shoulders-display-latin.woff2']
	},
	{
		query: 'family=IBM+Plex+Sans:wght@400',
		files: ['ibm-plex-sans-400-latin.woff2']
	},
	{
		query: 'family=IBM+Plex+Sans:wght@600',
		files: ['ibm-plex-sans-600-latin.woff2']
	},
	{
		query: 'family=IBM+Plex+Mono:wght@400',
		files: ['ibm-plex-mono-400-latin.woff2']
	},
	{
		query: 'family=IBM+Plex+Mono:wght@600',
		files: ['ibm-plex-mono-600-latin.woff2']
	}
];

/**
 * Pulls the `latin` @font-face src URLs out of a Google Fonts stylesheet.
 * The latin block is the last one for each face and is identified by its
 * unicode-range starting at U+0000.
 */
function latinSrcUrls(css) {
	const blocks = css.split('@font-face').slice(1);
	const urls = [];
	for (const block of blocks) {
		const range = block.match(/unicode-range:\s*([^;]+);/)?.[1] ?? '';
		// The latin subset is the one covering basic ASCII.
		if (!range.includes('U+0000')) continue;
		const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
		if (url) urls.push(url);
	}
	return urls;
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	for (const { query, files } of FAMILIES) {
		const cssUrl = `https://fonts.googleapis.com/css2?${query}&display=swap`;
		const css = await fetch(cssUrl, { headers: { 'User-Agent': UA } }).then((r) => {
			if (!r.ok) throw new Error(`${cssUrl} -> ${r.status}`);
			return r.text();
		});

		const urls = latinSrcUrls(css);
		if (urls.length < files.length) {
			throw new Error(
				`Expected ${files.length} latin face(s) for "${query}", found ${urls.length}. ` +
					`Google may have changed the family name or axis.`
			);
		}

		for (const [i, name] of files.entries()) {
			const bytes = new Uint8Array(await fetch(urls[i]).then((r) => r.arrayBuffer()));
			await writeFile(join(OUT_DIR, name), bytes);
			console.log(`${name}  ${(bytes.length / 1024).toFixed(1)} KB`);
		}
	}
}

await main();
