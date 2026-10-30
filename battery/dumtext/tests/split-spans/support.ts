import { expect } from "bun:test";
import type { SplitSpans } from "../../src/split-spans.js";

/** A text's characters but whitespace, as NFC. */
export const visible = (text: string) =>
	text.normalize("NFC").replace(/\s+/gu, "");

/** Each span's slice of `input`, with its Sentence. */
export const slices = (input: string, split: SplitSpans) =>
	split.paragraphs.flatMap(({ sentences }) =>
		sentences.map(({ text, start, end }) => ({
			text,
			slice: input.slice(start, end),
		})),
	);

/** Paragraphs as arrays of their Sentences, for comparing splits. */
export const sentenceLists = (
	paragraphs: readonly {
		readonly sentences: readonly (string | { readonly text: string })[];
	}[],
): string[][] =>
	paragraphs.map(({ sentences }) =>
		sentences.map((sentence) =>
			typeof sentence === "string" ? sentence : sentence.text,
		),
	);

/** The paragraphs as kinds and Sentences, offsets left out. */
export const sentencesOf = (split: SplitSpans) =>
	split.paragraphs.map(({ kind, sentences }) => ({
		kind,
		sentences: sentences.map(({ text }) => text),
	}));

/**
 * The spans are in order and inside the input, none overlaps the next,
 * and none starts or ends in whitespace.
 */
export function expectOrderedSpans(input: string, split: SplitSpans): void {
	let end = 0;
	for (const { sentences } of split.paragraphs)
		for (const span of sentences) {
			expect(span.start).toBeGreaterThanOrEqual(end);
			expect(span.end).toBeGreaterThan(span.start);
			expect(span.end).toBeLessThanOrEqual(input.length);
			const slice = input.slice(span.start, span.end);
			expect(slice.trim()).toBe(slice);
			end = span.end;
		}
}

/** mulberry32: a small seeded generator, so a seed always draws the same texts. */
export function generator(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const pick = <T>(random: () => number, items: readonly T[]): T =>
	items[Math.floor(random() * items.length)] as T;

/** Words, NFD ones and an emoji among them, so offsets meet both. */
export const words = [
	"Er",
	"sie",
	"Dann",
	"kam",
	"spät",
	"Müller",
	"été",
	"Straße",
	"usw.",
	"z. B.",
	"Dr.",
	"Mr",
	"Mr.",
	"3.",
	"Nr.",
	"„Hallo“",
	"»Ja«",
	"(so)",
	"–",
	"https://example.org/a.html",
	"&amp;",
	"שלום",
	"🙂",
	"1.",
];

/** Sentence ends, quotes and dashes among them. */
export const ends = [".", "!", "?", "…", ".“", "?«", "", ","];
