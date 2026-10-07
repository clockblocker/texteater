/**
 * A NOUN's opening article, the cases it leaves open, and its block of the
 * first request: its gender, kind and number questions, its Case question
 * when the article leaves the same cases open whatever the agreement, and
 * the reading of their answers.
 */

import {
	type ArticleMember,
	germanArticleCell,
	germanArticleSpellings,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import type { Written } from "../canonical-form.js";
import {
	ambiguousPieces,
	attestedMember,
	type MemberOrthography,
} from "../member-spelling.js";
import { type CaseOption, options, question } from "../prompts.js";
import {
	type Answered,
	type Choice,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
	UnresolvedAnswer,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import { cases, type Gender, genderOfArticle, type Shape } from "./shape.js";

/** A NOUN's or PROPN's Core Features. */
export type NounCore = Dumling.Lemma<
	"de",
	"Lexeme" | "Locution",
	"NOUN" | "PROPN"
>["coreFeatures"];

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
function articleCases(
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
 * The cases an article leaves open whatever its head's number and gender,
 * when every agreement leaves the same two or more: then the Case question
 * can ride in the first request, since the head's form narrows nothing.
 */
function casesBeforeAgreement(article: ArticleMember): readonly CaseOption[] {
	const sets = [
		articleCases(article, "Sing", "Masc"),
		articleCases(article, "Sing", "Fem"),
		articleCases(article, "Sing", "Neut"),
		articleCases(article, "Plur", null),
	].filter((set) => set.length > 0);
	const [first] = sets;
	return first &&
		first.length > 1 &&
		sets.every((set) => set.join(",") === first.join(","))
		? first
		: [];
}

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
	/** Cases asked in the first request, before agreement is known. */
	readonly earlyCases: readonly CaseOption[];
	/** The Case question over them. */
	readonly case: Choice<CaseOption> | undefined;
};

/** Asks a NOUN's gender, kind and number, and its Case when the article allows. */
export function askNominal(
	questionnaire: Questionnaire,
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
	const earlyCases: readonly CaseOption[] = article
		? casesBeforeAgreement(article.article)
		: [...cases, "Unmarked"];
	return {
		...identity,
		number,
		formGender,
		earlyCases,
		case:
			earlyCases.length > 0
				? caseQuestion(questionnaire, earlyCases)
				: undefined,
	};
}

/** A used common NOUN's number and the gender jev saw its form show, for Luna's article. */
export type NounRead = {
	readonly number: NonNullable<NounInflection["number"]>;
	readonly shown: Gender | null;
	readonly earlyCase: CaseOption | undefined;
};

/** The gender an article answer names, none for None. */
const genderNamed = (answer: string | undefined): Gender | null =>
	(answer !== undefined && genderOfArticle.get(answer)) || null;

/** A NOUN's Core Features: a proper noun's article, and the gender. */
function nounCore(nominal: NominalPlan, answered: Answered): NounCore {
	const article = nominal.article
		? answered.pick(nominal.article) === "Definite"
			? "Definite"
			: null
		: undefined;
	let gender = genderNamed(answered.pick(nominal.gender));
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
}

/**
 * Reads a NOUN's block: its Core Features and, when it is used rather than
 * cited, its cells and the cases still open.
 */
export function readNominal(
	shape: Shape,
	owned: OpeningArticle | undefined,
	nominal: NominalPlan,
	answered: Answered,
	cited: boolean,
): {
	readonly core: NounCore;
	readonly inflection: NounInflection | null;
	readonly openCases: readonly CaseOption[];
	readonly noun: NounRead | undefined;
} {
	let core = nounCore(nominal, answered);
	if (cited)
		return { core, inflection: null, openCases: [], noun: undefined };
	let noun: NounRead | undefined;
	const number = answered.pick(nominal.number);
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
			earlyCase: nominal.case && answered.peek(nominal.case),
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
		throw new UnresolvedAnswer("Unresolved formGender");
	let openCases: readonly CaseOption[] = owned
		? articleCases(owned.article, number, formGender ?? core.gender)
		: [...cases, "Unmarked"];
	// A common NOUN waits for the article Luna writes before this verdict.
	if (openCases.length === 0 && !noun)
		throw new UnresolvedAnswer(
			"The article agrees with no case of its head",
		);
	if (openCases.length > 0 && nominal.case) {
		const answer = answered.pick(nominal.case);
		if (!openCases.includes(answer))
			throw new UnresolvedAnswer("The Case answer fits no open cell");
		openCases = [answer];
	}
	const [only, ...others] = openCases;
	const settled =
		only !== undefined && others.length === 0 && only !== "Unmarked"
			? only
			: null;
	const inflection: NounInflection = shape.locution
		? { case: settled, number }
		: { case: settled, gender: formGender, number };
	return { core, inflection, openCases, noun };
}

/**
 * A common NOUN's Core gender and cells from the article Luna wrote with
 * its headword (der Kran; Rules de/core-features-are-identity,
 * de/adjectival-noun-lemma, de/plural-only-noun-has-no-gender: none for a
 * person noun made from an adjective or participle or a plural-only noun).
 * Undefined keeps jev's reading,
 * which already fell back to the likeliest gender the Sentence's article
 * allows: when Luna wrote none, or a gender the singular head's owned
 * article agrees with in no case, or none for a singular form whose
 * gender jev saw no form show, or one that rules out a Case jev answered.
 */
export function nounCells(
	owned: OpeningArticle | undefined,
	first: {
		readonly core: NounCore;
		readonly inflection: NounInflection | null;
		readonly noun: NounRead | undefined;
	},
	article: Written["article"],
):
	| {
			readonly core: NounCore;
			readonly inflection: NounInflection;
			readonly openCases: readonly CaseOption[];
	  }
	| undefined {
	const { noun } = first;
	if (!noun || !article || !first.inflection) return undefined;
	const gender = genderNamed(article);
	if (gender === (first.core.gender ?? null)) return undefined;
	const singular = noun.number === "Sing";
	const formGender = gender === null && singular ? noun.shown : null;
	if (gender === null && singular && formGender === null) return undefined;
	const agreeing = formGender ?? gender;
	let openCases: readonly CaseOption[] = owned
		? articleCases(owned.article, noun.number, agreeing)
		: [...cases, "Unmarked"];
	if (openCases.length === 0) return undefined;
	if (noun.earlyCase !== undefined) {
		if (!openCases.includes(noun.earlyCase)) return undefined;
		openCases = [noun.earlyCase];
	}
	const [only] = openCases;
	return {
		core: { ...first.core, gender },
		inflection: {
			...first.inflection,
			gender: formGender,
			case:
				openCases.length === 1 && only !== undefined
					? only === "Unmarked"
						? null
						: only
					: null,
		},
		openCases,
	};
}
