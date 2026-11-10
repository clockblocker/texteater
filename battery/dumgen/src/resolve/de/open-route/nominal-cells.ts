/**
 * A NOUN's cells and Case once Luna has written its headword: the gender
 * Luna's article names, a listed noun's mixed gender, and the Case over
 * the cells they leave.
 */

import {
	germanFreeGenderNoun,
	isGermanPluralOnlyNoun,
} from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import type { Written } from "../canonical-form.js";
import type { CaseOption } from "../prompts.js";
import { Unresolved } from "../questions.js";
import {
	articleCases,
	genderNamed,
	type NominalRead,
	type NounInflection,
	type NounRead,
	type OpeningArticle,
	type SettledCore,
	standing,
} from "./nominal.js";
import { casesFor } from "./paradigm.js";
import { cases, type Gender, type MixedGender } from "./shape.js";

/** A NOUN's settled Core Features and cells, and the cases still open. */
type Cells = {
	readonly core: SettledCore;
	readonly inflection: NounInflection;
	readonly openCases: readonly CaseOption[];
};

/**
 * A used common NOUN's cells over the cases its Core gender leaves open
 * where it stands, narrowed to the likeliest Case jev weighed early that
 * fits; undefined when none is left or none of jev's fits.
 */
function cellsOver(
	noun: NounRead,
	inflection: NounInflection,
	core: SettledCore,
	formGender: Gender | null,
	open: readonly CaseOption[],
): Cells | undefined {
	let openCases = standing(
		standing(open, noun.surface),
		casesFor(noun.cells, noun.number, formGender ?? core.gender),
	);
	if (openCases.length === 0) return undefined;
	if (noun.earlyCases.length > 0) {
		const best = noun.earlyCases.find((answer) =>
			openCases.includes(answer),
		);
		if (best === undefined) return undefined;
		openCases = [best];
	}
	const [only] = openCases;
	return {
		core,
		inflection: {
			...inflection,
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
function nounCells(
	owned: OpeningArticle | undefined,
	first: NominalRead,
	article: Written["article"],
): Cells | undefined {
	const { noun, inflection } = first;
	if (!noun || !article || !inflection) return undefined;
	const gender = genderNamed(article);
	if (gender === (first.core.gender ?? null)) return undefined;
	const singular = noun.number === "Sing";
	const formGender = gender === null && singular ? noun.shown : null;
	if (gender === null && singular && formGender === null) return undefined;
	return cellsOver(
		noun,
		inflection,
		{ ...first.core, gender },
		formGender,
		owned
			? articleCases(owned.article, noun.number, formGender ?? gender)
			: [...cases, "Unmarked"],
	);
}

/**
 * A used common NOUN's cells with a mixed Core gender: its article agrees
 * with any of the genders (Rule de/noun-gender-in-free-variation), so the
 * cases left open are those any of them leaves, and its Surface marks no
 * gender. Undefined when the article agrees with none of them.
 */
function mixedCells(
	owned: OpeningArticle | undefined,
	first: NominalRead,
	gender: MixedGender,
): Cells | undefined {
	const { noun, inflection } = first;
	if (!noun || !inflection) return undefined;
	const agreeing = (grammaticalCase: CaseOption) =>
		owned === undefined ||
		gender.mixed.some((member) =>
			articleCases(owned.article, noun.number, member).includes(
				grammaticalCase,
			),
		);
	return cellsOver(
		noun,
		inflection,
		{ ...first.core, gender },
		null,
		owned ? cases.filter(agreeing) : [...cases, "Unmarked"],
	);
}

/**
 * Whether a listed noun in free gender variation has its mixed gender here
 * (Rule de/noun-gender-in-free-variation): dumcorpus lists the nouns Duden
 * gives more than one gender in one sense, and when a listed noun has other
 * senses with one gender, jev says whether it means the listed one here.
 * Undefined for a noun not listed or meant in another sense.
 */
const mixedGenderOf = <Failure>(
	written: Written | undefined,
	senseOver: (
		sense: string,
	) => Effect.Effect<"Yes" | "No" | Unresolved, Failure>,
): Effect.Effect<MixedGender | Unresolved | undefined, Failure> =>
	Effect.gen(function* () {
		const listed = written && germanFreeGenderNoun(written.canonicalForm);
		if (!listed) return undefined;
		if (listed.sense === undefined) return listed.gender;
		const answer = yield* senseOver(listed.sense);
		if (answer instanceof Unresolved) return answer;
		return answer === "Yes" ? listed.gender : undefined;
	});

/** A NOUN's Core Features and cells once its Case is settled, and what Luna wrote. */
export type NominalCells = {
	readonly written: Written | undefined;
	readonly core: SettledCore;
	readonly inflection: NounInflection | null;
};

/**
 * A NOUN's cells and its Case, with Luna's headword. A used common NOUN's
 * gender is the article Luna writes with its headword when it fits the
 * Sentence's article, so Luna is awaited first and the Case is the
 * likeliest answer to the first request's Case question that the cells
 * of that gender leave. A common NOUN whose headword dumcorpus lists in
 * free gender variation takes its mixed gender instead, `senseOver`
 * asking whether it has the listed sense here when it has others.
 * `caseOver` asks the Case over cells still open only where the first
 * request asked none, as when where the NOUN stands rules out every cell
 * Luna's gender leaves; it asks nothing when one or none is.
 */
export const nominalCells = <Failure>(
	owned: OpeningArticle | undefined,
	first: NominalRead,
	writing: Effect.Effect<Written | undefined, Failure>,
	caseOver: (
		open: readonly CaseOption[],
	) => Effect.Effect<CaseOption | Unresolved | undefined, Failure>,
	senseOver: (
		sense: string,
	) => Effect.Effect<"Yes" | "No" | Unresolved, Failure>,
): Effect.Effect<NominalCells | Unresolved, Failure> =>
	Effect.gen(function* () {
		if (first.noun && first.inflection) {
			const written = yield* writing;
			const mixed = yield* mixedGenderOf(written, senseOver);
			if (mixed instanceof Unresolved) return mixed;
			// A noun with no singular has gender null, whatever article Luna
			// wrote (Rule de/plural-only-noun-has-no-gender): dumcorpus lists the
			// Pluraletantum nouns Duden gives only in the plural.
			const article =
				written && isGermanPluralOnlyNoun(written.canonicalForm)
					? "none"
					: written?.article;
			const cells = (mixed && mixedCells(owned, first, mixed)) ??
				nounCells(owned, first, article) ?? {
					core: first.core,
					inflection: first.inflection,
					openCases: first.openCases,
				};
			if (cells.openCases.length === 0)
				return new Unresolved({
					reason: "The article agrees with no case of its head",
				});
			// The Case was asked in the first request; an Unresolved answer
			// there is never asked again (ADR 0023).
			if (first.noun.caseAsked && cells.openCases.length > 1)
				return new Unresolved({ reason: "Unresolved case" });
			const caseAnswer = yield* caseOver(cells.openCases);
			return withCase(cells, caseAnswer, written);
		}
		const [caseAnswer, written] = yield* Effect.all(
			[caseOver(first.openCases), writing],
			{ concurrency: "unbounded" },
		);
		// A cited common NOUN is the same Lemma as a used one.
		const mixed = first.common
			? yield* mixedGenderOf(written, senseOver)
			: undefined;
		if (mixed instanceof Unresolved) return mixed;
		return withCase(
			mixed
				? { ...first, core: { ...first.core, gender: mixed } }
				: first,
			caseAnswer,
			written,
		);
	});

/** A NOUN's cells with the Case answered over them, Unmarked as none. */
function withCase(
	cells: {
		readonly core: SettledCore;
		readonly inflection: NounInflection | null;
	},
	caseAnswer: CaseOption | Unresolved | undefined,
	written: Written | undefined,
): NominalCells | Unresolved {
	if (caseAnswer instanceof Unresolved) return caseAnswer;
	const { core, inflection } = cells;
	return {
		written,
		core,
		inflection:
			caseAnswer === undefined || !inflection
				? inflection
				: {
						...inflection,
						case: caseAnswer === "Unmarked" ? null : caseAnswer,
					},
	};
}
