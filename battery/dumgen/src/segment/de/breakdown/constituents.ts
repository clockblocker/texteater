/**
 * German `segment.inConstituents` (Dumgen ADR 0007, system ADR 0050): a
 * Reading's immediate parts, one level down.
 *
 * - A word: code lists its candidate analyses (`word-analyses.ts`) and jev
 *   picks one, or none, in one request, `breakdown-analysis`, reading the
 *   Reading's emoji for its sense (`Wachstube` 💂 `Wach + stube`, 🕯
 *   `Wachs + tube`). A word too short to cut has none unasked, and a
 *   hyphenated one splits at its hyphens unasked, unless a lone `E` may be
 *   the prefix e- (`E- + Book` or `E + Book`, jev picks). Its words before
 *   the last hyphen, two or more, are one Locution part when jev weighs
 *   them one in `breakdown-locutions` (`[Kopf an Kopf] + Rennen`), else
 *   flat. Before it offers a prefix and a base verb against a prefix, a
 *   noun or adjective and the citation ending, jev weighs whether the base
 *   is a verb (`word-gates.ts`). A compound's head takes the word's own
 *   Kind, and code settles more parts unasked (`word-parts.ts`); a noun's
 *   first of two parts may be a cranberry piece, a Root (`Brom` in
 *   Brombeere), once jev weighs it no word of its own.
 * - A phraseme, or a Lexeme written as several words: its wording's parts
 *   come from code (`phraseme-parts.ts`), and jev weighs, in one request,
 *   `breakdown-locutions`, whether a run of neighbouring parts is a
 *   Locution of its own (`zu Hause`) and whether `sich` belongs to a verb
 *   lexically reflexive here, which it then joins (`sich verlassen`; a free
 *   `sich` stays a part of its own, `sich den Kopf zerbrechen`).
 *
 * Every part's route and Canonical Form then come from `targets.ts`, and a
 * compound's linking element from its first part's form (`interfix.ts`).
 * A phraseme's part that dumcorpus authors only as a pronoun is a PRON
 * (`was`), and a `zu` closing a wording after its open slot is the
 * infinitive PART (`um … zu`), both unasked.
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
import { onlyPronoun, reflexiveFormGuide } from "./forms.js";
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
	withFrontPhrase,
	wordAnalyses,
} from "./word-analyses.js";
import {
	mayBeCranberry,
	verbBaseQuestion,
	withVerbBases,
	wordQuestion,
} from "./word-gates.js";
import { cranberryShaped, openWordParts } from "./word-parts.js";
import {
	analysisInstructions,
	compoundRouteGuide,
	noneOption,
	phraseFormGuide,
	prefixedBaseRouteGuide,
	routeGuideOf,
	verbFirstPartRouteGuide,
} from "./word-prompts.js";

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
		if (piece.role !== "Word" && piece.role !== "Phrase") {
			result.push({ letters: piece.letters });
			continue;
		}
		const target = words[word++];
		if (target === undefined) throw Error("A word part has no link");
		const last = index === pieces.length - 1 || piece.role === "Phrase";
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
 * Closes a phraseme part's route question (#1241 round 1): a part's Kind is
 * its role in the whole expression. Kept here, since the route descriptions
 * are segment.inUnits's and stay shared.
 */
const phrasemeRouteGuide =
	"Judge the part by the role it plays inside this whole expression, not by its commonest use: a word that opens a clause, an infinitive clause included, is SCONJ (statt in statt … zu), while the zu right before an infinitive is PART; a comparison word, wie or als, is CCONJ before a phrase and SCONJ before a clause, never ADP or ADV (als in mehr Schein als Sein); a word that stands for a noun phrase on its own, with no noun after it, is PRON, not DET (jeder in jeder für sich), and so is a question word asking for a thing or a person (wer), whatever follows it.";

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

/**
 * A flat hyphenated analysis with its front phrase as one Locution part,
 * when jev weighs that phrase a fixed expression of its own (ADR 0050:
 * `[rund um die Uhr] + Betreuung`), else as it was (`Trimm-dich-Pfad`).
 */
const withLocutionFront = Effect.fnUntraced(function* (
	flat: WordAnalysis,
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<WordAnalysis, AskFailure> {
	const front = withFrontPhrase(flat);
	if (front === undefined) return flat;
	const answers = yield* ask({
		stage: "breakdown-locutions",
		state: whole.state,
		questions: { l_0: noul(locutionQuestion(whole.key, front.reads)) },
	});
	return noulOf(answers, "l_0") >= locutionFloor ? front.analysis : flat;
});

/** The analysis a word breaks down by, or none. */
const analysisOf = Effect.fnUntraced(function* (
	analyses: readonly WordAnalysis[],
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<WordAnalysis | undefined, AskFailure> {
	const [only] = analyses;
	if (only === undefined) return undefined;
	if (!only.pieces.some(({ role }) => role === "Hyphen"))
		return yield* chosenAnalysis(analyses, whole, ask);
	const analysis =
		analyses.length === 1
			? only
			: yield* chosenAnalysis(analyses, whole, ask);
	return analysis === only
		? yield* withLocutionFront(only, whole, ask)
		: analysis;
});

const wordConstituents = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<Constituents, AskFailure> {
	const { canonicalForm, kind } = input.reading.lemma;
	const whole = wholeOf(input, "word");
	const candidates = wordAnalyses(canonicalForm, kind);
	const analysis = yield* analysisOf(
		kind === "VERB"
			? yield* withVerbBases(candidates, whole, ask)
			: candidates,
		whole,
		ask,
	);
	if (analysis === undefined) return none;
	const [first] = analysis.pieces;
	const cranberry =
		cranberryShaped(analysis, kind) &&
		first !== undefined &&
		(yield* mayBeCranberry(first.letters, whole, ask));
	const targets = yield* partTargets(
		openWordParts(analysis, kind, cranberry),
		whole,
		ask,
		routeGuideOf(analysis, kind),
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
	verbFirstPartRouteGuide,
	prefixedBaseRouteGuide,
	phrasemeRouteGuide,
	cranberryOption,
	phraseFormGuide,
	reflexiveFormGuide,
	verbBaseQuestion("word", "…"),
	wordQuestion("word", "…"),
	...Object.values(hyphenPrefixGlosses),
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

/**
 * The route a wording's part may take: a reflexive verb, a noun group, a
 * Locution, a pronoun dumcorpus authors only as one (`was`), the
 * infinitive `zu` closing the wording after its open slot (`ohne … zu`),
 * or a word.
 */
function partRoutes(
	piece: WordingPiece & { role: "Part" },
	closesSlot: boolean,
): readonly RouteKey[] {
	if (piece.reflexive) return ["Lexeme/VERB"];
	if (piece.article) return articleRoutes;
	if (piece.words > 1) return locutionRoutes;
	if (onlyPronoun(piece.reads)) return ["Lexeme/PRON"];
	if (closesSlot && piece.reads.toLocaleLowerCase("de") === "zu")
		return ["Lexeme/PART"];
	return lexemeRoutes;
}

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
	const open: OpenPart[] = merged.flatMap((piece, index) =>
		piece.role === "Part" && !piece.ofVerb
			? [
					{
						reads: piece.reads,
						routes: partRoutes(piece, closesSlot(merged, index)),
					},
				]
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
