/**
 * A German phraseme's wording cut into its candidate parts by code (system
 * ADR 0050): the words, each fused word split into its components as
 * running text splits it (`i` and `m` of `im`), an article grouped with the
 * noun that follows it (`der Hase`, `m Pfeffer`; ADR 0040), placeholders
 * (`jdm.`, `etwas`) and punctuation left as filler. Every other word is a
 * part of its own, so no part is a Locution (ADR 0050). A Locution's
 * wording holds no lexical reflexive (ADR 0052), and a Saying's `sich` is
 * one of its words, a part of its own.
 */

import { articleForms } from "../candidates.js";
import { prepareGermanSegments } from "../segments.js";

/** One piece of the wording: a part to link, or filler between parts. */
export type WordingPiece =
	| {
			readonly role: "Part";
			readonly letters: string;
			/** What it stands for: `in` for the `i` of `im`, `dem Pfeffer` for `m Pfeffer`. */
			readonly reads: string;
			/** An article grouped with its noun. */
			readonly article?: true;
	  }
	| { readonly role: "Filler"; readonly letters: string };

/** Placeholders stand for what the context supplies; never a part (ADR 0050). */
const placeholders: ReadonlySet<string> = new Set([
	"jd.",
	"jdm.",
	"jdn.",
	"jds.",
	"etw.",
	"jemand",
	"jemandem",
	"jemanden",
	"jemandes",
	"etwas",
]);

const isNoun = (text: string) => /^\p{Lu}/u.test(text);

/** The wording's Segments as running text cuts them, every fused word split. */
function segmentsOf(wording: string) {
	return prepareGermanSegments(wording).runs.flatMap(
		(run) => (run.fallback ?? run.plans[0])?.segments ?? [],
	);
}

/** Adjacent filler joined into one piece, as a Breakdown stores it. */
function joined(pieces: readonly WordingPiece[]): WordingPiece[] {
	const result: WordingPiece[] = [];
	for (const piece of pieces) {
		const last = result.at(-1);
		if (piece.role === "Filler" && last?.role === "Filler")
			result[result.length - 1] = {
				role: "Filler",
				letters: last.letters + piece.letters,
			};
		else result.push(piece);
	}
	return result;
}

/** The wording's pieces: its parts in order, filler between them. */
export function wordingPieces(wording: string): WordingPiece[] {
	const segments = segmentsOf(wording);
	const pieces: WordingPiece[] = [];
	for (let index = 0; index < segments.length; index++) {
		const segment = segments[index];
		if (segment === undefined) continue;
		const { text } = segment;
		const reads = segment.surface ?? text;
		if (
			segment.kind !== "ResolvableText" ||
			placeholders.has(text.toLocaleLowerCase("de"))
		) {
			pieces.push({ role: "Filler", letters: text });
			continue;
		}
		const space = segments[index + 1];
		const noun = segments[index + 2];
		if (
			articleForms.has(reads.toLocaleLowerCase("de")) &&
			space?.kind === "Whitespace" &&
			noun?.kind === "ResolvableText" &&
			isNoun(noun.text)
		) {
			pieces.push({
				role: "Part",
				letters: text + space.text + noun.text,
				reads: `${reads} ${noun.surface ?? noun.text}`,
				article: true,
			});
			index += 2;
			continue;
		}
		pieces.push({ role: "Part", letters: text, reads });
	}
	return joined(pieces);
}
