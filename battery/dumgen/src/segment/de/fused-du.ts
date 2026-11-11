/** A pronoun that is only ever a subject: sie, es and ihr may be objects. */
const subjectOnly = /^(?:ich|er|wir|man)$/iu;

/**
 * Whether a subject of its own stands right beside a written word. A verb +
 * du fusion holds its clause's subject, so beside one the word is no fusion:
 * ich haste zum Zug and Dann haste ich los are hasten, Haste sie gesehen?
 * is hast du (#1338).
 */
export function besideAnotherSubject(before: string, after: string): boolean {
	const previous = before.match(/([\p{L}\p{M}]+) $/u)?.[1];
	const next = after.match(/^ ([\p{L}\p{M}]+)/u)?.[1];
	return [previous, next].some(
		(word) => word !== undefined && subjectOnly.test(word),
	);
}
