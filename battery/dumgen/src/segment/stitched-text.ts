/**
 * Stitched Text: one Sentence's text once code has normalized its
 * mechanical whitespace (#689). Segments concatenated give it back (Dumgen
 * ADR 0004).
 *
 * Code trims the Sentence and turns every run of spaces, tabs and other
 * non-line-break whitespace (no-break and thin spaces included) into one
 * ASCII space. Line breaks stay as written: verse keeps its lines, and
 * pasted line breaks are #528's to decide. No judge sees whitespace.
 */

const lineBreak = "\\n\\r\\u2028\\u2029";
const horizontalWhitespace = new RegExp(`[^\\S${lineBreak}]+`, "gu");

export function stitchedText(sentence: string): string {
	return sentence.trim().replace(horizontalWhitespace, " ");
}
