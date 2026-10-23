/**
 * A German phraseme's wording cut into its candidate parts by code (system
 * ADR 0050): the words, each fused word split into its components as
 * running text splits it (`i` and `m` of `im`), an article grouped with the
 * noun that follows it (`der Hase`, `m Pfeffer`; ADR 0040), placeholders
 * (`jdm.`, `etwas`) and punctuation left as filler. Code also proposes the
 * runs of two or three neighbouring parts that could be a Locution inside
 * the wording (`zu Hause` in `sich wie zu Hause fühlen`), and the verbs a
 * `sich` may belong to (`sich in Grund und Boden schämen`), for jev to
 * weigh.
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
			/** How many words it groups; a Locution candidate's parts add up. */
			readonly words: number;
			/** An article grouped with its noun. */
			readonly article?: true;
			/** A lexically reflexive verb read with its `sich` (`sich schämen`). */
			readonly reflexive?: true;
			/** A `sich` apart from its verb, linking where that verb's part does. */
			readonly ofVerb?: true;
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
				words: 2,
				article: true,
			});
			index += 2;
			continue;
		}
		pieces.push({ role: "Part", letters: text, reads, words: 1 });
	}
	return joined(pieces);
}

/**
 * A run of parts that could be one Locution: the indices of its first and
 * last piece in the wording's pieces, and how it reads.
 */
export type LocutionCandidate = {
	readonly first: number;
	readonly last: number;
	readonly reads: string;
};

/**
 * The runs of two or three neighbouring parts, with only spaces between
 * them, short of the whole wording; an article group counts as one part.
 */
export function locutionCandidates(
	pieces: readonly WordingPiece[],
): LocutionCandidate[] {
	const parts = pieces.filter((piece) => piece.role === "Part").length;
	const result: LocutionCandidate[] = [];
	for (let first = 0; first < pieces.length; first++) {
		const start = pieces[first];
		// A run neither starts nor ends inside a fused word (`i|m`).
		if (start?.role !== "Part" || pieces[first - 1]?.role === "Part")
			continue;
		let size = 1;
		const reads = [start.reads];
		for (let last = first + 2; last < pieces.length; last += 2) {
			const between = pieces[last - 1];
			const next = pieces[last];
			if (
				between?.role !== "Filler" ||
				between.letters !== " " ||
				next?.role !== "Part"
			)
				break;
			size++;
			reads.push(next.reads);
			if (size >= parts) break;
			if (pieces[last + 1]?.role !== "Part")
				result.push({ first, last, reads: reads.join(" ") });
			if (size === 3) break;
		}
	}
	return result;
}

/** The pieces with each chosen run merged into one part, chosen runs never overlapping. */
export function withLocutions(
	pieces: readonly WordingPiece[],
	runs: readonly LocutionCandidate[],
): WordingPiece[] {
	const result: WordingPiece[] = [];
	for (let index = 0; index < pieces.length; index++) {
		const run = runs.find(({ first }) => first === index);
		const piece = pieces[index];
		if (piece === undefined) continue;
		if (run === undefined) {
			result.push(piece);
			continue;
		}
		const inside = pieces.slice(run.first, run.last + 1);
		result.push({
			role: "Part",
			letters: inside.map(({ letters }) => letters).join(""),
			reads: run.reads,
			words: inside.reduce(
				(total, part) =>
					total + (part.role === "Part" ? part.words : 0),
				0,
			),
		});
		index = run.last;
	}
	return result;
}

/** A `sich` and an infinitive after it that may be lexically reflexive: their piece indices. */
export type ReflexiveCandidate = {
	readonly sich: number;
	readonly verb: number;
	readonly reads: string;
};

/** A lower-case word that may be an infinitive, past `den` and its like. */
const isInfinitive = (word: string) =>
	word.length >= 4 && /^\p{Ll}+(?:en|[elr]n)$/u.test(word);

/**
 * Each infinitive after the wording's `sich` (ADR 0050: `sich` joins a
 * lexically reflexive verb, and a free one is a part of its own).
 */
export function reflexiveCandidates(
	pieces: readonly WordingPiece[],
): ReflexiveCandidate[] {
	const sich = pieces.findIndex(
		(piece) =>
			piece.role === "Part" &&
			piece.words === 1 &&
			piece.reads.toLocaleLowerCase("de") === "sich",
	);
	if (sich < 0) return [];
	return pieces.flatMap((piece, verb) =>
		verb > sich &&
		piece.role === "Part" &&
		piece.words === 1 &&
		!piece.article &&
		isInfinitive(piece.reads)
			? [{ sich, verb, reads: piece.reads }]
			: [],
	);
}

/**
 * The pieces with `sich` joined to its verb: one part when only a space
 * stands between them (`sich verlassen`), else two that link to the one
 * reflexive verb (`sich` … `schämen`).
 */
export function withReflexive(
	pieces: readonly WordingPiece[],
	{ sich, verb }: ReflexiveCandidate,
): WordingPiece[] {
	const own = pieces[sich];
	const host = pieces[verb];
	const between = pieces[sich + 1];
	if (own?.role !== "Part" || host?.role !== "Part") return [...pieces];
	const reads = `${own.reads} ${host.reads}`;
	if (
		verb === sich + 2 &&
		between?.role === "Filler" &&
		between.letters === " "
	)
		return [
			...pieces.slice(0, sich),
			{
				role: "Part",
				letters: own.letters + between.letters + host.letters,
				reads,
				words: 2,
				reflexive: true,
			},
			...pieces.slice(verb + 1),
		];
	return pieces.map((piece, index) =>
		index === sich
			? { ...own, ofVerb: true }
			: index === verb
				? { ...host, reads, reflexive: true }
				: piece,
	);
}
