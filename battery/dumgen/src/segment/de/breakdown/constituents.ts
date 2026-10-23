/**
 * German `segment.inConstituents` (Dumgen ADR 0007, system ADR 0050): a
 * Reading's immediate parts, one level down.
 *
 * - A word: code lists its candidate analyses (`word-analyses.ts`) and jev
 *   picks one, or none, in one request, `breakdown-analysis`, reading the
 *   Reading's emoji for its sense (`Wachstube` 💂 `Wach + stube`, 🕯
 *   `Wachs + tube`). A word too short to cut has none unasked, and a
 *   hyphenated one splits at its hyphens unasked. A compound's head takes
 *   the word's own Kind (a noun's head is a noun), so only its other parts'
 *   routes are asked.
 * - A phraseme, or a Lexeme written as several words: its wording's parts
 *   come from code (`phraseme-parts.ts`), and jev weighs, in one request,
 *   `breakdown-locutions`, whether a run of neighbouring parts is a
 *   Locution of its own (`zu Hause`).
 *
 * Every part's route and Canonical Form then come from `targets.ts`, and a
 * compound's linking element from its first part's form (`interfix.ts`).
 */
import type { Questions } from "@typesafe-ai/sdk";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import {
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
	noul,
	noulOf,
} from "../../ask.js";
import {
	type BreakdownInput,
	breakdownState,
	type Constituents,
	type ProducedPiece,
} from "../../breakdown.js";
import { allRoutes, type RouteKey } from "../routes.js";
import { interfixOf } from "./interfix.js";
import {
	type LocutionCandidate,
	locutionCandidates,
	withLocutions,
	wordingPieces,
} from "./phraseme-parts.js";
import { type OpenPart, partTargets, type Whole } from "./targets.js";
import {
	type WordAnalysis,
	type WordPiece,
	wordAnalyses,
} from "./word-analyses.js";

/** The routes a part of a word may take. */
const wordPartRoutes: readonly RouteKey[] = [
	"Lexeme/NOUN",
	"Lexeme/VERB",
	"Lexeme/ADJ",
	"Lexeme/ADV",
	"Lexeme/ADP",
	"Lexeme/NUM",
	"Lexeme/PRON",
	"Lexeme/PROPN",
];

/** The Kinds whose compounds take their head's Kind: a proper name's head is a noun. */
const headRoutes: Readonly<Record<string, RouteKey>> = {
	NOUN: "Lexeme/NOUN",
	PROPN: "Lexeme/NOUN",
	VERB: "Lexeme/VERB",
	ADJ: "Lexeme/ADJ",
};

const lexemeRoutes = allRoutes.filter((key) => key.startsWith("Lexeme/"));
const locutionRoutes = allRoutes.filter((key) => key.startsWith("Locution/"));
const articleRoutes: readonly RouteKey[] = ["Lexeme/NOUN", "Lexeme/PROPN"];

/** A Locution candidate's weight must reach this to make one part. */
const locutionFloor = 0.5;

const none: Constituents = { kind: "NoConstituents" };

/** What the judge reads about the Reading: its wording, route, sense and Sentence. */
function wholeOf(input: BreakdownInput, key: "word" | "wording"): Whole {
	return { key, state: breakdownState(input, key) };
}

/** Constituents link at least two parts; fewer is none (ADR 0050). */
function constituentsOf(pieces: readonly ProducedPiece[]): Constituents {
	const linked = pieces.filter((piece) => piece.target !== undefined);
	return linked.length >= 2 ? { kind: "Constituents", pieces } : none;
}

const morpheme = (kind: string, canonicalForm: string) =>
	// Sound: German's Morpheme routes have Prefix, Suffix and Interfix Shadows.
	({
		language: "de",
		family: "Morpheme",
		kind,
		canonicalForm,
	}) as Dumrel.UnitShadow;

/**
 * An analysis's pieces with their links: a word part's from jev, an
 * affix's from the inventory, and a first word part's letters past its
 * form split off as its Interfix.
 */
function linkedPieces(
	pieces: readonly WordPiece[],
	words: readonly Dumrel.UnitShadow[],
): ProducedPiece[] {
	const result: ProducedPiece[] = [];
	let word = 0;
	for (const [index, piece] of pieces.entries()) {
		if (piece.role === "Prefix" || piece.role === "Suffix") {
			result.push({
				letters: piece.letters,
				target: morpheme(piece.role, piece.canonicalForm),
			});
			continue;
		}
		if (piece.role !== "Word") {
			result.push({ letters: piece.letters });
			continue;
		}
		const target = words[word++];
		if (target === undefined) throw Error("A word part has no link");
		const last = index === pieces.length - 1;
		const split = last
			? undefined
			: interfixOf(piece.letters, target.canonicalForm);
		if (split === undefined)
			result.push({ letters: piece.letters, target });
		else
			result.push(
				{ letters: split.word, target },
				{
					letters: split.interfix,
					target: morpheme("Interfix", split.canonicalForm),
				},
			);
	}
	return result;
}

const analysisInstructions =
	"How was `word` built, one level down? Pick its two immediate parts as a dictionary's word formation (DWDS Wortzerlegung) splits it: a compound's first word and its head, which may be a compound itself (Kohle + kraftwerk); a prefix or verb particle and its base (ver- + kaufen); a base and a suffix (Entspann + -ung). Pick `none` for a word with no word inside, or one converted whole from another word with nothing cut off (Lauf from laufen).";

/** The analysis jev picks, or none. */
const chosenAnalysis = Effect.fnUntraced(function* (
	analyses: readonly WordAnalysis[],
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<WordAnalysis | undefined, AskFailure> {
	const answers = yield* ask({
		stage: "breakdown-analysis",
		state: whole.state,
		questions: {
			analysis: choice(analysisInstructions, {
				...Object.fromEntries(
					analyses.map(({ label }, index) => [`a${index}`, label]),
				),
				none: "No immediate parts: a simple word, or a conversion",
			}),
		},
	});
	const picked = choiceOf(answers, "analysis").choice;
	return picked === "none" ? undefined : analyses[Number(picked.slice(1))];
});

const wordConstituents = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<Constituents, AskFailure> {
	const { canonicalForm, kind } = input.reading.lemma;
	const analyses = wordAnalyses(canonicalForm, kind);
	const whole = wholeOf(input, "word");
	const [only] = analyses;
	const hyphenated =
		analyses.length === 1 &&
		only?.pieces.some(({ role }) => role === "Hyphen");
	const analysis = hyphenated
		? only
		: analyses.length === 0
			? undefined
			: yield* chosenAnalysis(analyses, whole, ask);
	if (analysis === undefined) return none;
	const head = headRoutes[kind];
	const last = analysis.pieces.length - 1;
	const open: OpenPart[] = analysis.pieces.flatMap((piece, index) =>
		piece.role === "Word"
			? [
					{
						reads: piece.letters,
						routes:
							index === last && head !== undefined
								? [head]
								: wordPartRoutes,
					},
				]
			: [],
	);
	const targets = yield* partTargets(open, whole, ask);
	return constituentsOf(linkedPieces(analysis.pieces, targets));
});

/** The heaviest Locution candidates over the floor that don't overlap. */
const chosenLocutions = Effect.fnUntraced(function* (
	candidates: readonly LocutionCandidate[],
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<LocutionCandidate[], AskFailure> {
	const questions: Questions = {};
	for (const [index, candidate] of candidates.entries())
		questions[`l_${index}`] = noul(
			`Inside \`${whole.key}\`, do the words "${candidate.reads}" form a fixed expression of their own that dictionaries list apart from it (zu Hause, auf jeden Fall), rather than just neighbouring words of this one expression?`,
		);
	const answers = yield* askAny(ask, {
		stage: "breakdown-locutions",
		state: whole.state,
		questions,
	});
	const weighed = candidates
		.map((candidate, index) => ({
			candidate,
			weight: noulOf(answers, `l_${index}`),
		}))
		.filter(({ weight }) => weight >= locutionFloor)
		.sort((left, right) => right.weight - left.weight);
	const chosen: LocutionCandidate[] = [];
	for (const { candidate } of weighed)
		if (
			chosen.every(
				(other) =>
					candidate.last < other.first ||
					candidate.first > other.last,
			)
		)
			chosen.push(candidate);
	return chosen;
});

const phrasemeConstituents = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<Constituents, AskFailure> {
	const whole = wholeOf(input, "wording");
	const pieces = wordingPieces(input.reading.lemma.canonicalForm);
	const candidates = locutionCandidates(pieces);
	const locutions =
		candidates.length > 0
			? yield* chosenLocutions(candidates, whole, ask)
			: [];
	const merged = withLocutions(pieces, locutions);
	const open: OpenPart[] = merged.flatMap((piece) =>
		piece.role === "Part"
			? [
					{
						reads: piece.reads,
						routes: piece.article
							? articleRoutes
							: piece.words > 1
								? locutionRoutes
								: lexemeRoutes,
					},
				]
			: [],
	);
	const targets = yield* partTargets(open, whole, ask);
	let part = 0;
	return constituentsOf(
		merged.map((piece) =>
			piece.role === "Part"
				? { letters: piece.letters, ...withTarget(targets[part++]) }
				: { letters: piece.letters },
		),
	);
});

const withTarget = (target: Dumrel.UnitShadow | undefined) => {
	if (target === undefined) throw Error("A part has no link");
	return { target };
};

/**
 * German `segment.inConstituents`: a single-word Lexeme as a word, any
 * other Reading by its wording.
 */
export const germanConstituents = (
	input: BreakdownInput,
	ask: Ask,
): Effect.Effect<Constituents, AskFailure> => {
	const { family, canonicalForm } = input.reading.lemma;
	return family === "Lexeme" && !/\s/u.test(canonicalForm)
		? wordConstituents(input, ask)
		: phrasemeConstituents(input, ask);
};
