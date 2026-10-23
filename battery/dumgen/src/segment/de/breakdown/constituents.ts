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
 *   Locution of its own (`zu Hause`) and whether `sich` belongs to a verb
 *   lexically reflexive here, which it then joins (`sich verlassen`; a free
 *   `sich` stays a part of its own, `sich den Kopf zerbrechen`).
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
	type ReflexiveCandidate,
	reflexiveCandidates,
	type WordingPiece,
	withLocutions,
	withReflexive,
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

/**
 * The analysis question (#1241 round 1): read the sense `meaning` names,
 * since a homograph splits by sense; know the prefix + noun or adjective +
 * citation ending shape; and keep to parts that are words. Its examples
 * are no Breakdown case (#693).
 */
const analysisInstructions =
	"How was `word` built, one level down, in the sense `meaning` names? `meaning` is an emoji for this Reading's sense, and one spelling can split differently by sense (Staubecken: Stau + becken, a reservoir; Staub + ecken, dusty corners), so pick the analysis whose parts together give that sense, even when another analysis gives a commoner word. Pick its immediate parts as a dictionary's word formation (DWDS Wortzerlegung) splits it: a compound's first word and its head, which may be a compound itself (Sommer + schlussverkauf); a prefix or verb particle and its base verb (ver- + brennen, since brennen is a verb); a base and a suffix (Heiz + -ung). Check the base after a verb's prefix: when it is no verb a dictionary lists on its own, the verb was made from the noun or adjective inside it, so pick the prefix, that noun or adjective and the citation ending (vergolden is ver- + gold + -en, since there is no verb golden). Every part that isn't an affix must be a word a dictionary lists, though it may show the word without a final -e, with an umlaut or as a verb's stem (Schwimm for schwimmen): never pick an analysis with a part that is no word at all. Pick `none` for a word with no word inside, or one converted whole from another word with nothing cut off (Schlag from schlagen).";

/**
 * Closes a compound part's route question (#1241 round 1): a first part
 * showing a verb's stem is that verb (`Wach` in Wachstube 💂 is wachen,
 * DWDS).
 */
const compoundRouteGuide =
	"A part that shows a verb's stem without its ending is that verb (Schwimm in Schwimmbad is schwimmen, Bohr in Bohrmaschine is bohren).";

/**
 * Closes the base's route question in a prefix + base + citation ending
 * analysis (#1241 round 1): the verb was made from that base.
 */
const prefixedBaseRouteGuide =
	"This verb was made from a noun or adjective with a prefix and the citation ending, so the part between them is that noun or adjective, not a verb.";

/** The route guide for an analysis's word parts: a compound's, a prefixed base's, or none. */
function routeGuideOf(analysis: WordAnalysis): string | undefined {
	if (analysis.pieces.some(({ role }) => role === "Ending"))
		return prefixedBaseRouteGuide;
	const words = analysis.pieces.filter(({ role }) => role === "Word");
	return words.length === analysis.pieces.length && words.length > 1
		? compoundRouteGuide
		: undefined;
}

/**
 * Closes a phraseme part's route question (#1241 round 1): a part's Kind is
 * its role in the whole expression. Kept here, since the route descriptions
 * are segment.inUnits's and stay shared.
 */
const phrasemeRouteGuide =
	"Judge the part by the role it plays inside this whole expression, not by its commonest use: a word that opens a clause, an infinitive clause included, is SCONJ (statt in statt … zu); a comparison word, wie or als, is CCONJ before a phrase and SCONJ before a clause, never ADP or ADV (als in mehr Schein als Sein); a word that stands for a noun phrase on its own, with no noun after it, is PRON, not DET (jeder in jeder für sich).";

const noneOption = "No immediate parts: a simple word, or a conversion";

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
				none: noneOption,
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
	const targets = yield* partTargets(
		open,
		whole,
		ask,
		routeGuideOf(analysis),
	);
	return constituentsOf(linkedPieces(analysis.pieces, targets));
});

/**
 * What `sich` is to a verb in a wording, judged in the sense the verb has
 * there (ADR 0050): only `lexical` joins it to the verb. Unlike a click's
 * reflexive question, there is no Sentence, so each use names its test.
 */
const reflexiveUses = {
	free: "An object of its own: in this sense the verb also takes another person or thing in the place of sich, and the subject only happens to be the one it acts on (sich waschen: ihn waschen; sich verteidigen: sie verteidigen)",
	dative: "A dative beside another object, for whom something is done or whose body it concerns (sich die Hände reiben; sich die Zähne putzen)",
	lexical:
		"Part of the verb itself: dictionaries list the verb with sich for this sense, and nothing else can stand in its place (sich schämen, sich beeilen, sich weigern)",
	other: "sich does not belong with this verb",
};

/** Whether a run inside a wording is a Locution of its own. */
const locutionQuestion = (key: string, reads: string) =>
	`Inside \`${key}\`, do the words "${reads}" form a fixed expression of their own that dictionaries list apart from it (auf jeden Fall, vor allem), rather than just neighbouring words of this one expression?`;

/**
 * Every text segment.inConstituents's questions and options carry beyond
 * the shared route descriptions, for the disjointness test (#693).
 */
export const constituentsPromptTexts = (): readonly string[] => [
	analysisInstructions,
	noneOption,
	compoundRouteGuide,
	prefixedBaseRouteGuide,
	phrasemeRouteGuide,
	locutionQuestion("wording", "…"),
	...Object.values(reflexiveUses),
];

/** What jev groups inside a wording: its inner Locutions and a reflexive verb's `sich`. */
type Groups = {
	readonly locutions: LocutionCandidate[];
	readonly reflexive: ReflexiveCandidate | undefined;
};

/**
 * In one request: whether `sich` belongs to a verb, lexically reflexive in
 * this wording (ADR 0050, `sich verlassen`), and the heaviest Locution
 * candidates over the floor that overlap neither each other nor that pair.
 */
const chosenGroups = Effect.fnUntraced(function* (
	candidates: readonly LocutionCandidate[],
	reflexives: readonly ReflexiveCandidate[],
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<Groups, AskFailure> {
	const questions: Questions = {};
	for (const [index, candidate] of candidates.entries())
		questions[`l_${index}`] = noul(
			locutionQuestion(whole.key, candidate.reads),
		);
	for (const [index, candidate] of reflexives.entries())
		questions[`x_${index}`] = choice(
			`In \`${whole.key}\`, what is "sich" to the verb "${candidate.reads}"? Judge the verb in the sense it has inside this expression.`,
			reflexiveUses,
		);
	const answers = yield* askAny(ask, {
		stage: "breakdown-locutions",
		state: whole.state,
		questions,
	});
	const reflexive = reflexives.find(
		(_, index) => choiceOf(answers, `x_${index}`).choice === "lexical",
	);
	const free = (first: number, last: number) =>
		reflexive === undefined ||
		[reflexive.sich, reflexive.verb].every(
			(index) => index < first || index > last,
		);
	const weighed = candidates
		.map((candidate, index) => ({
			candidate,
			weight: noulOf(answers, `l_${index}`),
		}))
		.filter(
			({ candidate, weight }) =>
				weight >= locutionFloor &&
				free(candidate.first, candidate.last),
		)
		.sort((left, right) => right.weight - left.weight);
	const locutions: LocutionCandidate[] = [];
	for (const { candidate } of weighed)
		if (
			locutions.every(
				(other) =>
					candidate.last < other.first ||
					candidate.first > other.last,
			)
		)
			locutions.push(candidate);
	return { locutions, reflexive };
});

/** The route a wording's part may take: a reflexive verb, a noun group, a Locution or a word. */
function partRoutes(
	piece: WordingPiece & { role: "Part" },
): readonly RouteKey[] {
	if (piece.reflexive) return ["Lexeme/VERB"];
	if (piece.article) return articleRoutes;
	return piece.words > 1 ? locutionRoutes : lexemeRoutes;
}

const phrasemeConstituents = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<Constituents, AskFailure> {
	const whole = wholeOf(input, "wording");
	const pieces = wordingPieces(input.reading.lemma.canonicalForm);
	const candidates = locutionCandidates(pieces);
	const reflexives = reflexiveCandidates(pieces);
	const { locutions, reflexive } =
		candidates.length + reflexives.length > 0
			? yield* chosenGroups(candidates, reflexives, whole, ask)
			: { locutions: [], reflexive: undefined };
	const withRuns = withLocutions(pieces, locutions);
	// The runs keep `sich` and its verb as they were, so their pieces are found again.
	const merged =
		reflexive === undefined
			? withRuns
			: withReflexive(withRuns, {
					...reflexive,
					sich: withRuns.indexOf(
						pieces[reflexive.sich] as WordingPiece,
					),
					verb: withRuns.indexOf(
						pieces[reflexive.verb] as WordingPiece,
					),
				});
	const open: OpenPart[] = merged.flatMap((piece) =>
		piece.role === "Part" && !piece.ofVerb
			? [{ reads: piece.reads, routes: partRoutes(piece) }]
			: [],
	);
	const targets = yield* partTargets(open, whole, ask, phrasemeRouteGuide);
	let part = 0;
	const linked = merged.map((piece) =>
		piece.role === "Part" && !piece.ofVerb ? targets[part++] : undefined,
	);
	const verbTarget =
		linked[
			merged.findIndex(
				(piece) => piece.role === "Part" && piece.reflexive === true,
			)
		];
	return constituentsOf(
		merged.map((piece, index) =>
			piece.role !== "Part"
				? { letters: piece.letters }
				: {
						letters: piece.letters,
						...withTarget(
							piece.ofVerb ? verbTarget : linked[index],
						),
					},
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
