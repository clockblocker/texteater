/**
 * Where the Markdown reader's text came from, for the span API
 * (`split-markdown.ts`). A Traced string holds each code unit's offset in
 * the NFC source, or -1 for a unit the reader wrote itself, such as the
 * space that joins two lines. The reader writes only whitespace and the
 * backslash that escapes an ordered item's period, which it then drops, so
 * every visible unit it keeps points at the source.
 */
import type { Run } from "./extracted-text.js";

export type Traced = { readonly text: string; readonly at: readonly number[] };

/** `text` as it stands in the source from `start` on. */
export const fromSource = (text: string, start: number): Traced => ({
	text,
	at: Array.from({ length: text.length }, (_, unit) => start + unit),
});

/** `text` as the reader writes it, standing nowhere in the source. */
export const written = (text: string): Traced => ({
	text,
	at: Array.from({ length: text.length }, () => -1),
});

export const sliced = (
	traced: Traced,
	start: number,
	end = traced.text.length,
): Traced => ({
	text: traced.text.slice(start, end),
	at: traced.at.slice(start, end),
});

export const joined = (parts: readonly Traced[]): Traced => ({
	text: parts.map(({ text }) => text).join(""),
	at: parts.flatMap(({ at }) => at),
});

export const trimmedStart = (traced: Traced): Traced =>
	sliced(traced, traced.text.length - traced.text.trimStart().length);

export const trimmedEnd = (traced: Traced): Traced =>
	sliced(traced, 0, traced.text.trimEnd().length);

export const trimmed = (traced: Traced): Traced =>
	trimmedStart(trimmedEnd(traced));

/**
 * Each Run's source offsets, beside the Run so the Extracted Text itself
 * carries no offset (Dumgen ADR 0004). A Run the Markdown reader did not
 * make has none.
 */
export const runSources = new WeakMap<Run, readonly number[]>();

/** A Run, with its source offsets recorded when it has them. */
export function traceRun(run: Run, at: readonly number[] | undefined): Run {
	if (at !== undefined) runSources.set(run, at);
	return run;
}
