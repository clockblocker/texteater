/**
 * A NOUN's opening article, the cases it leaves open, and its block of the
 * first request: its gender, kind and number questions, its Case question
 * when the article leaves the same cases open whatever the agreement, and
 * the reading of their answers. Its cells once Luna has written its
 * headword are `nominal-cells.ts`.
 */

import {
	type ArticleMember,
	germanArticleCell,
	germanArticleSpellings,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import {
	ambiguousPieces,
	attestedMember,
	type MemberOrthography,
} from "../member-spelling.js";
import { type CaseOption, options, question } from "../prompts.js";
import {
	type Answered,
	answerReader,
	type Choice,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
	type ReaderBody,
	unresolved,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	cases,
	type Gender,
	genderOfArticle,
	type MixedGender,
	type Shape,
} from "./shape.js";
import { type SurfaceCase, surfaceCases } from "./surface-cases.js";

type NominalCore = Dumling.Lemma<
	"de",
	"Lexeme" | "Locution",
	"NOUN" | "PROPN"
>["coreFeatures"];

/** A NOUN's or PROPN's Core Features as jev and Luna read them, with one gender or none. */
type NounCore = NominalCore & { readonly gender: Gender | null };

/** A NOUN's or PROPN's settled Core Features: a listed noun's gender may be mixed. */
export type SettledCore = NominalCore & {
	readonly gender: Gender | MixedGender | null;
};

/** A nominal Surface's features; a NOUN Locution's have no gender. */
export type NounInflection = NonNullable<
	Dumling.Surface<
		"de",
		"Lexeme" | "Locution",
		"NOUN" | "PROPN"
	>["inflectionalFeatures"]
>;

/** The article that opens an article owner's unit, and the orthography it was read in. */
export type OpeningArticle = {
	readonly member: Member;
	readonly article: ArticleMember;
	readonly orthography: MemberOrthography;
};

/**
 * The article that opens an article owner's unit, read through its fused
 * or shortened form (Rule de/only-der-and-ein-are-articles): a standalone
 * spelling that names no article as written may be a shortened one ('ne).
 */
export function openingArticle(
	target: Target,
	shape: Shape,
): OpeningArticle | undefined {
	const [first] = target.members;
	if (!shape.articleOwner || !first || target.members.length < 2)
		return undefined;
	const tried = first.spelling
		? [first.spelling.orthography]
		: (["Standard", "Shorthand"] as const);
	for (const orthography of tried) {
		// A fused piece that names several words ('s: es or das) is read only
		// once the Sentence has chosen one, so it decides no opening article.
		if (
			orthography === "Fused" &&
			ambiguousPieces(target.segments, [first.segment]).size > 0
		)
			return undefined;
		const article: ArticleMember = attestedMember(
			target.segments,
			first.segment,
			orthography,
			new Map(),
		);
		if (
			(germanArticleSpellings(article) ?? []).length > 0 &&
			germanArticleCell(article, {
				case: null,
				number: null,
				gender: null,
			})
		)
			return { member: first, article, orthography };
	}
	return undefined;
}

/** The cases a head's article leaves open for its number and gender. */
export function articleCases(
	article: ArticleMember,
	number: string | null,
	gender: string | null,
): readonly CaseOption[] {
	return cases.filter(
		(grammaticalCase) =>
			germanArticleCell(article, {
				case: grammaticalCase,
				number,
				gender: number === "Plur" ? null : gender,
			}) !== undefined,
	);
}

/**
 * The cases an article leaves open for any number and gender of its head:
 * the Case question rides in the first request over them, and the head's
 * agreement, once known, keeps the likeliest answer it allows.
 */
function casesOfArticle(article: ArticleMember): readonly CaseOption[] {
	const open = new Set([
		...articleCases(article, "Sing", "Masc"),
		...articleCases(article, "Sing", "Fem"),
		...articleCases(article, "Sing", "Neut"),
		...articleCases(article, "Plur", null),
	]);
	return cases.filter((grammaticalCase) => open.has(grammaticalCase));
}

/**
 * The cases among `open` the NOUN can take where it stands
 * (`surface-cases.ts`), Unmarked kept; all of `open` when none is.
 */
export function standing(
	open: readonly CaseOption[],
	surface: readonly SurfaceCase[],
): readonly CaseOption[] {
	const kept = open.filter(
		(grammaticalCase) =>
			grammaticalCase === "Unmarked" ||
			surface.some((allowed) => allowed === grammaticalCase),
	);
	return kept.some((grammaticalCase) => grammaticalCase !== "Unmarked")
		? kept
		: open;
}

/**
 * The Case answer and the other cases jev weighed, likeliest first; none
 * when jev answered Unresolved, so that the cells agreement leaves decide,
 * and the click is Unresolved only when they leave more than one.
 */
const rankedCases = (
	asked: Choice<CaseOption>,
	answered: Answered,
): readonly CaseOption[] => {
	const answer = answered.peek(asked);
	return answer === undefined
		? []
		: [answer, ...answered.alternatives(asked)];
};

/** The Case question over the cases still open. */
export function caseQuestion(
	questionnaire: Questionnaire,
	open: readonly CaseOption[],
): Choice<CaseOption> {
	return questionnaire.choice(
		"case",
		question.nounCase,
		optionsOf(open, options.nounCase),
		["inflection"],
	);
}

/** What a NOUN's block asked. */
export type NominalPlan = {
	/** A proper noun's article question. */
	readonly article: ChoiceOf<typeof options.properArticle> | undefined;
	readonly gender: ChoiceOf<
		typeof options.nounGender | typeof options.properGender
	>;
	readonly nounKind: ChoiceOf<typeof options.nounKind> | undefined;
	readonly number: ChoiceOf<typeof options.number>;
	readonly formGender: ChoiceOf<typeof options.formGender> | undefined;
	/** The cases the NOUN can take where it stands, before its article. */
	readonly surface: readonly SurfaceCase[];
	/** Cases asked in the first request, before agreement is known. */
	readonly earlyCases: readonly CaseOption[];
	/** The Case question over them. */
	readonly case: Choice<CaseOption> | undefined;
};

/**
 * Asks a NOUN's gender, kind and number, and its Case over the cases its
 * article and where it stands leave, when more than one is left (#1326).
 */
export function askNominal(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	article: OpeningArticle | undefined,
): NominalPlan {
	const identity = shape.proper
		? {
				article: questionnaire.choice(
					"article",
					question.properArticle,
					options.properArticle,
					["properNoun"],
				),
				gender: questionnaire.choice(
					"gender",
					question.properGender,
					options.properGender,
					["properNoun"],
				),
				nounKind: undefined,
			}
		: {
				article: undefined,
				gender: questionnaire.choice(
					"gender",
					shape.locution
						? question.locutionGender
						: question.nounGender,
					options.nounGender,
					["noun"],
				),
				nounKind: shape.locution
					? undefined
					: questionnaire.choice(
							"nounKind",
							question.nounKind,
							options.nounKind,
							["noun"],
						),
			};
	const number = questionnaire.choice(
		"number",
		question.nounNumber,
		options.number,
	);
	const formGender = shape.locution
		? undefined
		: questionnaire.choice(
				"formGender",
				question.formGender,
				options.formGender,
			);
	const surface = surfaceCases(target, target.units);
	const earlyCases = standing(
		article ? casesOfArticle(article.article) : [...cases, "Unmarked"],
		surface,
	);
	return {
		...identity,
		number,
		formGender,
		surface,
		earlyCases,
		case:
			earlyCases.length > 1
				? caseQuestion(questionnaire, earlyCases)
				: undefined,
	};
}

/** A used common NOUN's number and the gender jev saw its form show, for Luna's article. */
export type NounRead = {
	readonly number: NonNullable<NounInflection["number"]>;
	readonly shown: Gender | null;
	/** The cases the NOUN can take where it stands, before its article. */
	readonly surface: readonly SurfaceCase[];
	/** The early Case answer and the others jev weighed, likeliest first. */
	readonly earlyCases: readonly CaseOption[];
	/** Whether the Case was asked in the first request. */
	readonly caseAsked: boolean;
};

/** The gender an article answer names, none for None. */
export const genderNamed = (answer: string | undefined): Gender | null =>
	(answer !== undefined && genderOfArticle.get(answer)) || null;

/** A NOUN's Core Features: a proper noun's article, and the gender. */
const nounCore = answerReader(function* (
	nominal: NominalPlan,
	answered: Answered,
): ReaderBody<NounCore> {
	const article = nominal.article
		? (yield* answered.pick(nominal.article)) === "Definite"
			? "Definite"
			: null
		: undefined;
	let gender = genderNamed(yield* answered.pick(nominal.gender));
	// Only a person noun made from an adjective or participle, or a noun
	// with no singular, has no gender (Rule de/adjectival-noun-lemma);
	// an ordinary noun shown in its plural keeps its singular's.
	const kind = nominal.nounKind && answered.peek(nominal.nounKind);
	if (kind === "Adjectival" || kind === "PluralOnly") gender = null;
	if (kind === "Ordinary" && gender === null)
		gender = genderNamed(
			answered
				.alternatives(nominal.gender)
				.find((option) => genderOfArticle.has(option)),
		);
	return article === undefined ? { gender } : { article, gender };
});

/**
 * A head's number: an owned article is hard evidence of it, as of its
 * gender, so when the judged number agrees with no cell of the article,
 * the likeliest other number jev weighed that does is read instead (ein
 * Paar is never plural).
 */
function numberOf<Number extends string>(
	article: ArticleMember | undefined,
	judged: Number,
	others: readonly Number[],
): Number {
	if (!article || articleCases(article, judged, null).length > 0)
		return judged;
	return (
		others.find((other) => articleCases(article, other, null).length > 0) ??
		judged
	);
}

/** What a NOUN's block settles in the first request, and the cases still open. */
export type NominalRead = {
	/** A common NOUN Lexeme, whose gender may be a listed mixed one. */
	readonly common: boolean;
	readonly core: NounCore;
	readonly inflection: NounInflection | null;
	readonly openCases: readonly CaseOption[];
	readonly noun: NounRead | undefined;
};

/**
 * Reads a NOUN's block: its Core Features and, when it is used rather than
 * cited, its cells and the cases still open.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export const readNominal = answerReader(function* (
	shape: Shape,
	owned: OpeningArticle | undefined,
	nominal: NominalPlan,
	answered: Answered,
	cited: boolean,
): ReaderBody<NominalRead> {
	const common = shape.lexeme && !shape.proper;
	let core = yield* nounCore(nominal, answered);
	if (cited)
		return {
			common,
			core,
			inflection: null,
			openCases: [],
			noun: undefined,
		};
	let noun: NounRead | undefined;
	const number = numberOf(
		owned?.article,
		yield* answered.pick(nominal.number),
		answered.alternatives(nominal.number),
	);
	const ranked = nominal.case ? rankedCases(nominal.case, answered) : [];
	const peekFormGender = () =>
		nominal.formGender && answered.peek(nominal.formGender);
	const shown =
		!shape.locution && core.gender === null && number === "Sing"
			? peekFormGender()
			: undefined;
	let formGender = genderNamed(shown);
	if (shape.lexeme && !shape.proper) {
		noun = {
			number,
			shown: genderNamed(peekFormGender()),
			surface: nominal.surface,
			earlyCases: ranked,
			caseAsked: nominal.case !== undefined,
		};
	}
	// A singular head's owned article is hard evidence of its
	// gender: when the judged one agrees with no case of the
	// article, the likeliest other gender jev weighed that does is
	// read instead (der Tisch is never Neut).
	const article = owned?.article;
	if (
		article &&
		!shape.locution &&
		number === "Sing" &&
		articleCases(article, number, formGender ?? core.gender).length === 0
	) {
		const onForm = core.gender === null;
		const asked = onForm ? nominal.formGender : nominal.gender;
		const agreeing = (asked ? answered.alternatives(asked) : [])
			.map((option) => genderOfArticle.get(option))
			.find(
				(option) =>
					option !== undefined &&
					articleCases(article, number, option).length > 0,
			);
		if (agreeing !== undefined && !onForm)
			core = { ...core, gender: agreeing };
		if (agreeing !== undefined && onForm) formGender = agreeing;
	}
	if (
		!shape.locution &&
		!shape.proper &&
		core.gender === null &&
		number === "Sing" &&
		!formGender
	)
		return yield* unresolved("Unresolved formGender");
	let openCases = standing(
		owned
			? articleCases(owned.article, number, formGender ?? core.gender)
			: [...cases, "Unmarked"],
		nominal.surface,
	);
	// A common NOUN waits for the article Luna writes before these verdicts.
	if (openCases.length === 0 && !noun)
		return yield* unresolved("The article agrees with no case of its head");
	const best = ranked.find((answer) => openCases.includes(answer));
	if (best !== undefined) openCases = [best];
	else if (!noun && nominal.case && openCases.length > 1)
		return yield* unresolved(
			ranked.length > 0
				? "The Case answer fits no open cell"
				: "Unresolved case",
		);
	const [only, ...others] = openCases;
	const settled =
		only !== undefined && others.length === 0 && only !== "Unmarked"
			? only
			: null;
	const inflection: NounInflection = shape.locution
		? { case: settled, number }
		: { case: settled, gender: formGender, number };
	return { common, core, inflection, openCases, noun };
});
