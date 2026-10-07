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
import type { Written } from "../canonical-form.js";
import {
	ambiguousPieces,
	attestedMember,
	type MemberOrthography,
} from "../member-spelling.js";
import { question } from "../prompts.js";
import {
	type Answered,
	type Questionnaire,
	UnresolvedAnswer,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	caseNames,
	cases,
	genderOfArticle,
	numbers,
	type Shape,
	type Values,
} from "./shape.js";

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
): readonly string[] {
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
function casesBeforeAgreement(article: ArticleMember): readonly string[] {
	const sets = [
		articleCases(article, "Sing", "Masc"),
		articleCases(article, "Sing", "Fem"),
		articleCases(article, "Sing", "Neut"),
		articleCases(article, "Plur", null),
	]
		.filter((set) => set.length > 0)
		.map((set) => set.join(","));
	const [first] = sets;
	return first && sets.every((set) => set === first) && first.includes(",")
		? first.split(",")
		: [];
}

/** The Case question over the cases still open. */
export function caseQuestion(
	questionnaire: Questionnaire,
	open: readonly string[],
): void {
	questionnaire.choice(
		"case",
		question.nounCase,
		Object.fromEntries(
			open.map((value) => [
				value,
				value === "Unmarked"
					? question.unmarkedCase
					: caseNames[value as keyof typeof caseNames],
			]),
		),
		["inflection"],
	);
}

/** What a NOUN's block asked. */
export type NominalPlan = {
	/** Cases asked in the first request, before agreement is known. */
	readonly earlyCases: readonly string[];
};

/** Asks a NOUN's gender, kind and number, and its Case when the article allows. */
export function askNominal(
	questionnaire: Questionnaire,
	shape: Shape,
	article: OpeningArticle | undefined,
): NominalPlan {
	if (shape.proper) {
		questionnaire.choice(
			"article",
			question.properArticle,
			{
				Definite: "Cited with its definite article",
				Bare: "Cited bare",
			},
			["properNoun"],
		);
		questionnaire.choice(
			"gender",
			question.properGender,
			{
				der: question.properGenderMasc,
				die: question.properGenderFem,
				das: question.properGenderNeut,
				None: question.properGenderNone,
			},
			["properNoun"],
		);
	} else {
		questionnaire.choice(
			"gender",
			shape.locution ? question.locutionGender : question.nounGender,
			{
				der: question.nounGenderMasc,
				die: question.nounGenderFem,
				das: question.nounGenderNeut,
				None: question.nounGenderNone,
			},
			["noun"],
		);
		if (!shape.locution)
			questionnaire.choice(
				"nounKind",
				question.nounKind,
				{
					Ordinary: question.nounKindOrdinary,
					PluralOnly: question.nounKindPluralOnly,
					Adjectival: question.nounKindAdjectival,
				},
				["noun"],
			);
	}
	questionnaire.choice("number", question.nounNumber, numbers);
	if (!shape.locution)
		questionnaire.choice("formGender", question.formGender, {
			der: "Masculine, as der shows",
			die: "Feminine, as die shows",
			das: "Neuter, as das shows",
		});
	const earlyCases = article
		? casesBeforeAgreement(article.article)
		: [...cases, "Unmarked"];
	if (earlyCases.length > 0) caseQuestion(questionnaire, earlyCases);
	return { earlyCases };
}

/** A used common NOUN's number and the gender jev saw its form show, for Luna's article. */
export type NounRead = {
	readonly number: string;
	readonly shown: string | null;
	readonly earlyCase: string | undefined;
};

/** A NOUN's Core Features: a proper noun's article, and the gender. */
function nounCore(shape: Shape, answered: Answered): Values {
	const core: Values = {};
	if (shape.proper)
		core.article =
			answered.pick("article") === "Definite" ? "Definite" : null;
	const gender = answered.pick("gender");
	core.gender =
		gender === "None" ? null : (genderOfArticle[gender] ?? gender);
	// Only a person noun made from an adjective or participle, or a noun
	// with no singular, has no gender (Rule de/adjectival-noun-lemma);
	// an ordinary noun shown in its plural keeps its singular's.
	const kind = answered.peek("nounKind");
	if (kind === "Adjectival" || kind === "PluralOnly") core.gender = null;
	if (kind === "Ordinary" && core.gender === null) {
		const likeliest = answered
			.alternatives("gender")
			.find((option) => option in genderOfArticle);
		if (likeliest !== undefined) core.gender = genderOfArticle[likeliest];
	}
	return core;
}

/**
 * Reads a NOUN's block: its Core Features and, when it is used rather than
 * cited, its cells and the cases still open.
 */
export function readNominal(
	shape: Shape,
	owned: OpeningArticle | undefined,
	nominal: NominalPlan,
	questionnaire: Questionnaire,
	answered: Answered,
	cited: boolean,
): {
	readonly core: Values;
	readonly inflection: Values | null;
	readonly openCases: readonly string[];
	readonly noun: NounRead | undefined;
} {
	const core = nounCore(shape, answered);
	if (cited)
		return { core, inflection: null, openCases: [], noun: undefined };
	let noun: NounRead | undefined;
	const number = answered.pick("number");
	const shown =
		!shape.locution && core.gender === null && number === "Sing"
			? answered.peek("formGender")
			: undefined;
	let formGender =
		shown === undefined ? null : (genderOfArticle[shown] ?? shown);
	if (shape.lexeme && !shape.proper) {
		const seen = answered.peek("formGender");
		noun = {
			number,
			shown: seen === undefined ? null : (genderOfArticle[seen] ?? seen),
			earlyCase:
				nominal.earlyCases.length > 0
					? answered.peek("case")
					: undefined,
		};
	}
	// A singular head's owned article is hard evidence of its
	// gender: when the judged one agrees with no case of the
	// article, the likeliest other gender jev weighed that does is
	// read instead (der Tisch is never Neut).
	const article = owned?.article;
	const judgedGender = (formGender ?? core.gender) as string | null;
	if (
		article &&
		!shape.locution &&
		number === "Sing" &&
		articleCases(article, number, judgedGender).length === 0
	) {
		const id = core.gender === null ? "formGender" : "gender";
		const agreeing = (
			id in questionnaire.questions ? answered.alternatives(id) : []
		)
			.map((option) => genderOfArticle[option])
			.find(
				(option) =>
					option !== undefined &&
					articleCases(article, number, option).length > 0,
			);
		if (agreeing !== undefined && id === "gender") core.gender = agreeing;
		if (agreeing !== undefined && id === "formGender")
			formGender = agreeing;
	}
	if (
		!shape.locution &&
		!shape.proper &&
		core.gender === null &&
		number === "Sing" &&
		!formGender
	)
		throw new UnresolvedAnswer("Unresolved formGender");
	const inflection: Values = shape.locution
		? { case: null, number }
		: { case: null, gender: formGender, number };
	const agreeing = (formGender ?? core.gender) as string | null;
	let openCases: readonly string[] = owned
		? articleCases(owned.article, number, agreeing)
		: [...cases, "Unmarked"];
	// A common NOUN waits for the article Luna writes before this verdict.
	if (openCases.length === 0 && !noun)
		throw new UnresolvedAnswer(
			"The article agrees with no case of its head",
		);
	if (openCases.length > 0 && nominal.earlyCases.length > 0) {
		const answer = answered.pick("case");
		if (!openCases.includes(answer))
			throw new UnresolvedAnswer("The Case answer fits no open cell");
		openCases = [answer];
	}
	if (openCases.length === 1)
		inflection.case = openCases[0] === "Unmarked" ? null : openCases[0];
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
		readonly core: Values;
		readonly inflection: Values | null | undefined;
		readonly noun?: NounRead;
	},
	article: Written["article"],
):
	| {
			readonly core: Values;
			readonly inflection: Values | null | undefined;
			readonly openCases: readonly string[];
	  }
	| undefined {
	const { noun } = first;
	if (!noun || !article || !first.inflection) return undefined;
	const gender =
		article === "none" ? null : (genderOfArticle[article] ?? null);
	if (gender === (first.core.gender ?? null)) return undefined;
	const singular = noun.number === "Sing";
	const formGender = gender === null && singular ? noun.shown : null;
	if (gender === null && singular && formGender === null) return undefined;
	const agreeing = formGender ?? gender;
	let openCases: readonly string[] = owned
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
