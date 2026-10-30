/**
 * German `segment.inConstituents` (Dumgen ADR 0007, system ADR 0050): a
 * Reading's immediate parts, one level down.
 *
 * - A word: code lists its candidate analyses (`word-analyses.ts`) and jev
 *   picks one, or none, in one request, `breakdown-analysis`, reading the
 *   Reading's emoji for its sense (`Wachstube` 💂 `Wach + stube`, 🕯
 *   `Wachs + tube`). A word too short to cut has none unasked, and a
 *   hyphenated one splits at its hyphens unasked, unless a lone `E` may be
 *   the prefix e- (`E- + Book` or `E + Book`, jev picks), each word a part
 *   (ADR 0054). Before it offers a prefix and a base verb against a prefix, a
 *   noun or adjective and the citation ending, jev weighs whether the base
 *   is a verb (`word-gates.ts`). When the pick is contested, jev weighs
 *   which contender gives the Reading's sense, in
 *   `breakdown-senses` (`word-senses.ts`). A compound's head takes the
 *   word's own Kind, and code settles more parts unasked (`word-parts.ts`);
 *   a noun's first of two parts may be a cranberry piece, a Root (`Brom` in
 *   Brombeere), once jev weighs it no word of its own, unless the sense
 *   check chose that compound over the pick; and a suffix's base
 *   is a verb or a noun unasked when jev weighs it one and not the other.
 * - A phraseme, or a Lexeme written as several words: its wording's parts
 *   come from code (`phraseme-parts.ts`), one per word, an article grouped
 *   with its noun, so no part is a Locution (ADR 0050). The wording is the
 *   bare Canonical Form, with no lexical reflexive (ADR 0052); a Saying's
 *   `sich` is a part of its own.
 *
 * Every part's route and Canonical Form then come from `targets.ts`, and a
 * compound's linking element from its first part's form (`interfix.ts`).
 * A phraseme's part that dumcorpus authors only as a pronoun is a PRON
 * (`was`); one it authors only as an inflected determiner or pronoun is a
 * DET before a noun and a PRON where no noun can follow (`allem` in
 * `alles in allem`, Rule de/pron-or-det-by-use); a `zu` closing a
 * wording after its open slot is the infinitive PART (`um … zu`), and one
 * right before a noun the ADP (`zu Gast sein`), all unasked.
 */
import { germanSuffixes, isGermanAttributiveForm } from "dumcorpus/inventories";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { type Ask, type AskFailure, choice, choiceOf } from "../../ask.js";
import {
	type BreakdownInput,
	breakdownState,
	type Constituents,
	isSingleWordLexeme,
	type ProducedPiece,
} from "../../breakdown-pieces.js";
import { allRoutes, type RouteKey } from "../routes.js";
import {
	inflectedDeterminerOrPronoun,
	nounPartFormGuide,
	onlyPronoun,
	reflexiveFormGuide,
} from "./forms.js";
import { interfixOf } from "./interfix.js";
import { type WordingPiece, wordingPieces } from "./phraseme-parts.js";
import { phrasemeRouteGuide } from "./phraseme-prompts.js";
import {
	keptPrefixOption,
	prefixCutInstructions,
	prefixCutOption,
	withTestedPrefixes,
} from "./prefix-cut.js";
import {
	citedWord,
	noSenseOption,
	senseInstructions,
	senseOption,
	senseQuestion,
} from "./sense-prompts.js";
import {
	cranberryOption,
	type OpenPart,
	partTargets,
	type Whole,
} from "./targets.js";
import {
	hyphenPrefixGlosses,
	type WordAnalysis,
	type WordPiece,
	wordAnalyses,
} from "./word-analyses.js";
import {
	adjectiveQuestion,
	mayBeCranberry,
	nounQuestion,
	suffixBaseRoute,
	verbBaseQuestion,
	withVerbBases,
	wordQuestion,
} from "./word-gates.js";
import {
	cranberryShaped,
	openWordParts,
	particleAdposition,
} from "./word-parts.js";
import {
	analysisInstructions,
	compoundRouteGuide,
	noneOption,
	prefixedBaseRouteGuide,
	routeGuideOf,
	verbFirstPartRouteGuide,
} from "./word-prompts.js";
import { senseChecked, weighedOptions } from "./word-senses.js";

const lexemeRoutes = allRoutes.filter((key) => key.startsWith("Lexeme/"));
const articleRoutes: readonly RouteKey[] = ["Lexeme/NOUN", "Lexeme/PROPN"];

const none: Constituents = { kind: "NoConstituents" };

/** What the judge reads about the Reading: its wording, route, sense and Sentence. */
const wholeOf = (input: BreakdownInput, key: "word" | "wording"): Whole => ({
	key,
	state: breakdownState(input, key),
});

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
 * affix's from the inventory, a particle's outside a verb its ADP
 * (`particleAdposition`), and a first word part's letters past its form
 * split off as its Interfix, unless they are an adjective's frozen
 * attributive ending (`[[lang|Lange]] + [[Weile|weile]]`, ADR 0050).
 */
function linkedPieces(
	pieces: readonly WordPiece[],
	words: readonly Dumrel.UnitShadow[],
	kind: string,
): ProducedPiece[] {
	const result: ProducedPiece[] = [];
	let word = 0;
	for (const [index, piece] of pieces.entries()) {
		if (piece.role === "Prefix" || piece.role === "Suffix") {
			result.push({
				letters: piece.letters,
				target:
					(piece.role === "Prefix"
						? particleAdposition(piece.canonicalForm, kind)
						: undefined) ??
					morpheme(piece.role, piece.canonicalForm),
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
		const attributive =
			target.kind === "ADJ" &&
			isGermanAttributiveForm(piece.letters, target.canonicalForm);
		const split =
			last || attributive
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

/** How the sense check names a word: as cited (`das Rentier`), and its Kind. */
type Sense = { readonly cited: string; readonly kind: string };

/**
 * A word's analysis, or none, and whether the sense check chose it over
 * the analysis question's pick.
 */
type Chosen = {
	readonly analysis: WordAnalysis | undefined;
	readonly bySense: boolean;
};

/**
 * The analysis jev picks, or none; with `sense`, once its sense is checked
 * when the pick is contested (`word-senses.ts`).
 */
const chosenAnalysis = Effect.fnUntraced(function* (
	analyses: readonly WordAnalysis[],
	whole: Whole,
	ask: Ask,
	sense?: Sense,
): Effect.fn.Return<Chosen, AskFailure> {
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
	const answer = choiceOf(answers, "analysis");
	const picked =
		answer.choice === "none"
			? undefined
			: analyses[Number(answer.choice.slice(1))];
	if (sense === undefined) return { analysis: picked, bySense: false };
	const tested = yield* withTestedPrefixes(
		weighedOptions(analyses, answer.probabilities),
		picked,
		{ whole, kind: sense.kind },
		ask,
	);
	const checked = yield* senseChecked(
		tested.options,
		tested.picked,
		{ whole, ...sense },
		ask,
	);
	return { analysis: checked, bySense: checked !== tested.picked };
});

/** The analysis a word breaks down by, or none. */
const analysisOf = Effect.fnUntraced(function* (
	analyses: readonly WordAnalysis[],
	whole: Whole,
	sense: Sense,
	ask: Ask,
): Effect.fn.Return<Chosen, AskFailure> {
	const [only] = analyses;
	if (only === undefined) return { analysis: undefined, bySense: false };
	if (!only.pieces.some(({ role }) => role === "Hyphen"))
		return yield* chosenAnalysis(analyses, whole, ask, sense);
	const analysis =
		analyses.length === 1
			? only
			: (yield* chosenAnalysis(analyses, whole, ask)).analysis;
	return { analysis, bySense: false };
});

const wordConstituents = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<Constituents, AskFailure> {
	const { lemma } = input.reading;
	const { kind, coreFeatures } = lemma;
	const { canonicalForm } = lemma;
	const whole = wholeOf(input, "word");
	const candidates = wordAnalyses(canonicalForm, kind);
	const gender = "gender" in coreFeatures ? coreFeatures.gender : undefined;
	const { analysis, bySense } = yield* analysisOf(
		kind === "VERB"
			? yield* withVerbBases(candidates, whole, ask)
			: candidates,
		whole,
		{ cited: citedWord(canonicalForm, gender), kind },
		ask,
	);
	if (analysis === undefined) return none;
	const [first, suffix, ...rest] = analysis.pieces;
	// A compound the sense check chose over the pick won as two words, the
	// first telling the head apart: it is no cranberry piece (#1241 round 4).
	const cranberry =
		cranberryShaped(analysis, kind) &&
		!bySense &&
		first !== undefined &&
		(yield* mayBeCranberry(first.letters, whole, ask));
	const parts = openWordParts(analysis, kind, cranberry);
	// A suffix's base with no one base Kind: its letters may settle its route.
	const baseRoute =
		first?.role === "Word" &&
		suffix?.role === "Suffix" &&
		suffix.baseKind === undefined &&
		rest.length === 0
			? yield* suffixBaseRoute(first.letters, suffix.letters, whole, ask)
			: undefined;
	const [base] = parts;
	const targets = yield* partTargets(
		baseRoute === undefined || base === undefined
			? parts
			: [
					{
						...base,
						routes: baseRoute.routes,
						...(baseRoute.nouns === undefined
							? {}
							: {
									routeForms: {
										"Lexeme/NOUN": baseRoute.nouns,
									},
								}),
					},
					...parts.slice(1),
				],
		whole,
		ask,
		routeGuideOf(analysis, kind),
		{ NOUN: nounPartFormGuide },
	);
	return constituentsOf(linkedPieces(analysis.pieces, targets, kind));
});

/** Two word pieces, for the univerbation's sense texts in the disjointness test. */
const twoWords: WordAnalysis = {
	pieces: [
		{ role: "Word", letters: "…" },
		{ role: "Word", letters: "…" },
	],
	label: "…",
};

/**
 * Every text segment.inConstituents's questions and options carry beyond
 * the shared route descriptions, for the disjointness test (#693).
 */
export const constituentsPromptTexts = (): readonly string[] => [
	analysisInstructions,
	noneOption,
	compoundRouteGuide,
	verbFirstPartRouteGuide,
	prefixedBaseRouteGuide,
	phrasemeRouteGuide,
	cranberryOption,
	reflexiveFormGuide,
	nounPartFormGuide,
	verbBaseQuestion("word", "…"),
	wordQuestion("word", "…"),
	nounQuestion("word", "…"),
	adjectiveQuestion("word", "…"),
	prefixCutInstructions("word", "…"),
	prefixCutOption("word", "…", "…"),
	keptPrefixOption("word", "…"),
	senseQuestion({ pieces: [], label: "…" }, "…", "…", "NOUN"),
	senseQuestion(twoWords, "…", "…", "ADV"),
	senseOption(twoWords, "ADV"),
	senseInstructions("…", "…"),
	senseOption({ pieces: [], label: "…" }, "NOUN"),
	noSenseOption,
	...germanSuffixes.flatMap(({ sense }) => (sense ? [sense] : [])),
	...Object.values(hyphenPrefixGlosses),
];

/** The endings an attributive adjective shows after a determiner (`aller guten`). */
const adjectiveEnding = /(?:e|en|em|er|es)$/u;

/**
 * Rule de/pron-or-det-by-use read off the wording, for a part that is only
 * an inflected determiner or pronoun (`inflectedDeterminerOrPronoun`): a
 * DET before a noun, a PRON at the wording's end or before a word no
 * attributive adjective could be (`alles in allem`, `dieses und jenes`);
 * undefined, so jev is asked, before an adjective-like word, a slot,
 * placeholder or punctuation, where the noun may come later.
 */
function determinerOrPronoun(
	next: WordingPiece | undefined,
	after: WordingPiece | undefined,
): RouteKey | undefined {
	if (next === undefined) return "Lexeme/PRON";
	if (
		next.role !== "Filler" ||
		next.letters !== " " ||
		after?.role !== "Part"
	)
		return undefined;
	const [word = ""] = after.reads.split(/\s+/u);
	if (/^\p{Lu}/u.test(word)) return "Lexeme/DET";
	return adjectiveEnding.test(word) ? undefined : "Lexeme/PRON";
}

/**
 * The route a wording's part may take: a noun group, a pronoun dumcorpus
 * authors only as one (`was`), an inflected
 * determiner or pronoun by what follows it (`allem`), the infinitive `zu`
 * closing the wording after its open slot (`ohne … zu`), the preposition
 * `zu` before a noun (`zu Gast`), or a word.
 */
function partRoutes(
	pieces: readonly WordingPiece[],
	index: number,
): readonly RouteKey[] {
	const piece = pieces[index];
	if (piece?.role !== "Part") return lexemeRoutes;
	if (piece.article) return articleRoutes;
	if (onlyPronoun(piece.reads)) return ["Lexeme/PRON"];
	const settled = inflectedDeterminerOrPronoun(piece.reads)
		? determinerOrPronoun(pieces[index + 1], pieces[index + 2])
		: undefined;
	if (settled !== undefined) return [settled];
	if (piece.reads.toLocaleLowerCase("de") === "zu") {
		if (closesSlot(pieces, index)) return ["Lexeme/PART"];
		if (beforeNoun(pieces, index)) return ["Lexeme/ADP"];
	}
	return lexemeRoutes;
}

/**
 * Whether the part right after the piece at `index`, joined to it or one
 * space on, is a noun or an article with its noun (`zu Gast`, `zu|m
 * Glück`), so a `zu` there is the preposition, not the infinitive's PART
 * (#1241 round 6).
 */
const beforeNoun = (pieces: readonly WordingPiece[], index: number) => {
	const next = pieces[index + 1];
	const part =
		next?.role === "Filler" && next.letters === " "
			? pieces[index + 2]
			: next;
	return (
		part?.role === "Part" &&
		(part.article === true || /^\p{Lu}/u.test(part.reads))
	);
};

/** Whether the piece at `index` ends the wording right after its open slot (`…`). */
const closesSlot = (pieces: readonly WordingPiece[], index: number) => {
	const before = pieces[index - 1];
	return (
		index === pieces.length - 1 &&
		before?.role === "Filler" &&
		before.letters.includes("…")
	);
};

const phrasemeConstituents = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<Constituents, AskFailure> {
	const whole = wholeOf(input, "wording");
	const pieces = wordingPieces(input.reading.lemma.canonicalForm);
	const open: OpenPart[] = pieces.flatMap((piece, index) =>
		piece.role === "Part"
			? [
					{
						reads: piece.reads,
						routes: partRoutes(pieces, index),
					},
				]
			: [],
	);
	const targets = yield* partTargets(open, whole, ask, phrasemeRouteGuide);
	let part = 0;
	return constituentsOf(
		pieces.map((piece) =>
			piece.role !== "Part"
				? { letters: piece.letters }
				: { letters: piece.letters, ...withTarget(targets[part++]) },
		),
	);
});

const withTarget = (target: Dumrel.UnitShadow | undefined) => {
	if (target === undefined) throw Error("A part has no link");
	return { target };
};

/**
 * German `segment.inConstituents`: a single-word Lexeme as a word, any
 * other Reading by its wording, its bare Canonical Form (ADR 0052).
 */
export const germanConstituents = (
	input: BreakdownInput,
	ask: Ask,
): Effect.Effect<Constituents, AskFailure> =>
	isSingleWordLexeme(input.reading.lemma)
		? wordConstituents(input, ask)
		: phrasemeConstituents(input, ask);
