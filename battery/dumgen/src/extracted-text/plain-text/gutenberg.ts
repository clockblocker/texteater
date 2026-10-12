/**
 * Project Gutenberg's wrapping around a book (#1190): the header with its
 * `Title:` line, the `*** START OF … ***` and `*** END OF … ***` markers,
 * the producer credit after the start and the licence after the end. A
 * Learner reads the book, not the wrapping.
 */

const startMarker =
	/^\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG E-?(?:BOOK|TEXT)\b.*$/imu;
const endMarker =
	/^(?:\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG|End of (?:the )?Project Gutenberg(?:'s|’s)? )/imu;
const titleLine = /^Title:[ \t]*(\S.*(?:\n[ \t]+\S.*)*)/mu;
const credit =
	/^\s*(?:Produced by|E-?text prepared by|Transcribed (?:from|by)|This e-?book was (?:produced|prepared))\b[\s\S]*?(?:\n[^\S\n]*\n|$)/iu;

/** A book's text and its Gutenberg title, or the text as it is. */
export function unwrapGutenberg(text: string): {
	readonly title?: string;
	readonly body: string;
} {
	const start = startMarker.exec(text);
	if (start === null) return { body: text };
	const header = text.slice(0, start.index);
	const afterStart = text.slice(start.index + start[0].length);
	const end = endMarker.exec(afterStart);
	const body = (
		end === null ? afterStart : afterStart.slice(0, end.index)
	).replace(credit, "");
	const title = titleLine.exec(header)?.[1]?.replace(/\s+/gu, " ").trim();
	return title ? { title, body } : { body };
}
