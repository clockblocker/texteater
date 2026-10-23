import { expect, test } from "bun:test";
import { loadBreakdownRecords } from "dumcorpus";
import { foldCase } from "dumling";
import { constituentsPromptTexts } from "../../../src/segment/de/breakdown/constituents.js";
import { morphemesInstructions } from "../../../src/segment/de/breakdown/morphemes.js";

const words = (text: string) =>
	foldCase(text, "de")
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean);

/** The text with each `a + b` example joined back into its word (`Heiz + -ung` → Heizung). */
const joined = (text: string) => text.replace(/-?\s*\+\s*-?/gu, "");

/** Whether `form`'s words occur in `text` in a row. */
const occursIn = (form: readonly string[], text: readonly string[]) =>
	form.length > 0 &&
	text.some((_, start) =>
		form.every((word, offset) => text[start + offset] === word),
	);

test("no Breakdown prompt names a Breakdown Record's Lemma, whole or split into its parts, held-out ones included (#693)", () => {
	const lemmas = new Map<string, string>();
	for (const { id, reading } of loadBreakdownRecords())
		lemmas.set(reading.lemma.canonicalForm, id);
	expect(lemmas.size).toBeGreaterThan(40);
	const texts = [...constituentsPromptTexts(), morphemesInstructions];
	const clashes = texts.flatMap((text) =>
		[...lemmas]
			.filter(([form]) =>
				[text, joined(text)].some((variant) =>
					occursIn(words(form), words(variant)),
				),
			)
			.map(
				([form, id]) => `«${text.slice(0, 40)}…» uses ${form} (${id})`,
			),
	);
	expect(clashes).toEqual([]);
});
