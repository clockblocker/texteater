/** A NOUN's opening article, the cases it leaves open, and its Case question. */

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
import type { FirstRead, Plan } from "../open-route.js";
import { question } from "../prompts.js";
import type { Questionnaire } from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	caseNames,
	cases,
	genderOfArticle,
	type Shape,
	type Values,
} from "./shape.js";

/**
 * The article that opens an article owner's unit, read through its fused
 * or shortened form (Rule de/only-der-and-ein-are-articles): a standalone
 * spelling that names no article as written may be a shortened one ('ne).
 */
export function openingArticle(
	target: Target,
	shape: Shape,
):
	| {
			readonly member: Member;
			readonly article: ArticleMember;
			readonly orthography: MemberOrthography;
	  }
	| undefined {
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
export function casesBeforeAgreement(
	article: ArticleMember,
): readonly string[] {
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
	planned: Plan,
	first: FirstRead,
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
	let openCases: readonly string[] = planned.article
		? articleCases(planned.article.article, noun.number, agreeing)
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
