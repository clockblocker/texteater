/** How long a title made from a Scroll's first line may run. */
const TITLE_LENGTH = 48;

/**
 * What a Scroll is called wherever it is named, the Library, a Heading, the
 * trail: its title, or its first line cut short when it has none.
 */
export function scrollTitle(scroll: {
	readonly title?: string;
	readonly sourceText: string;
}): string {
	if (scroll.title) return scroll.title;
	const line = scroll.sourceText.trim().split("\n")[0] ?? "";
	return line.length > TITLE_LENGTH
		? `${line.slice(0, TITLE_LENGTH - 1).trimEnd()}…`
		: line;
}
