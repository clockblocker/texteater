/** How long a title made from a Text's first line may run. */
const TITLE_LENGTH = 48;

/**
 * What a Text is called wherever it is named, the Library, a Heading, the
 * trail: its title, or its first line cut short when it has none.
 */
export function textTitle(text: {
	readonly title?: string;
	readonly sourceText: string;
}): string {
	if (text.title) return text.title;
	const line = text.sourceText.trim().split("\n")[0] ?? "";
	return line.length > TITLE_LENGTH
		? `${line.slice(0, TITLE_LENGTH - 1).trimEnd()}…`
		: line;
}
