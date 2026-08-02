/** Turns "Avengers: Doomsday" into "avengersdoomsday". Internal ids only. */
export function slugify(title: string): string {
	return (
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '')
			.slice(0, 40) || 'film'
	);
}
