/**
 * The block of a word that agrees with a noun (a NUM or SYM Lexeme, a DET,
 * NUM or PRON Locution): whether it inflects here, and its case, gender
 * and number, which an attributive ADJ is asked too.
 */

import type * as Dumling from "dumling/types";
import { options, question } from "../prompts.js";
import {
	type Answered,
	answerReader,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
	type ReaderBody,
} from "../questions.js";
import type { Target } from "../target.js";
import type { PhraseCell } from "./paradigm.js";
import { phraseCells, surfaceCases } from "./phrase-cells.js";

/** An agreeing word's case, gender and number, as a NUM Lexeme's Surface takes them. */
export type Agreement = NonNullable<
	Dumling.Surface<"de", "Lexeme", "NUM">["inflectionalFeatures"]
>;

/** The questions of an agreeing word's case, gender and number. */
export type AgreementQuestions = ReturnType<typeof agreementQuestions>;

/**
 * Asks an agreeing word's case, gender and number: its case over the
 * cases its phrase's cells leave (`phrase-cells.ts`), and none when only
 * one is left.
 */
export function agreementQuestions(
	questionnaire: Questionnaire,
	target: Target,
) {
	const cells = phraseCells(target, target.units);
	const cases = surfaceCases(target, target.units);
	return {
		cells,
		cases,
		case:
			cases.length > 1
				? questionnaire.choice(
						"agreement.case",
						question.agreementCase,
						optionsOf(cases, options.case),
					)
				: undefined,
		gender: questionnaire.choice(
			"agreement.gender",
			question.agreementGender,
			options.agreementGender,
		),
		number: questionnaire.choice(
			"agreement.number",
			question.agreementNumber,
			options.number,
		),
	};
}

/** A small weight for an option jev gave none, so the paradigm still decides between them. */
const floor = 0.001;

/**
 * The cell jev's answers name when the phrase allows it; otherwise the
 * allowed cell whose case, number and gender jev weighed likeliest
 * together, the gender weighed among the genders alone (#1339). So den
 * with a plural noun is Dat, des with a noun jev read as plural is
 * singular, and a singular with no gender takes the likeliest gender
 * its cells leave. Unmarked names plural agreement and no cell.
 */
function agreeingCell(
	cells: readonly PhraseCell[],
	answer: {
		readonly case: string | null;
		readonly number: string;
		readonly gender: string;
	},
	weights: {
		readonly case: Readonly<Record<string, number>>;
		readonly number: Readonly<Record<string, number>>;
		readonly gender: Readonly<Record<string, number>>;
	},
): PhraseCell | undefined {
	const named = cells.find(
		(cell) =>
			(answer.case === null || cell.case === answer.case) &&
			cell.number === answer.number &&
			(cell.number === "Plur" || cell.gender === answer.gender),
	);
	if (named) return named;
	const weight = (table: Readonly<Record<string, number>>, key: string) =>
		(table[key] ?? 0) + floor;
	const genderTotal = ["Masc", "Fem", "Neut"].reduce(
		(total, gender) => total + weight(weights.gender, gender),
		0,
	);
	let best: PhraseCell | undefined;
	let bestScore = -1;
	for (const cell of cells) {
		const score =
			(answer.case === null ? 1 : weight(weights.case, cell.case)) *
			weight(weights.number, cell.number) *
			(cell.gender === null
				? 1
				: weight(weights.gender, cell.gender) / genderTotal);
		if (score > bestScore) {
			best = cell;
			bestScore = score;
		}
	}
	return best;
}

/**
 * Reads an agreeing word's case, gender and number as one cell of its
 * phrase (`agreeingCell`): a plural has no gender.
 */
export const readAgreement = answerReader(function* (
	agreement: AgreementQuestions,
	answered: Answered,
): ReaderBody<Agreement> {
	const number = yield* answered.pick(agreement.number);
	const gender = yield* answered.pick(agreement.gender);
	// Where it stands leaves at least one case, and one asks nothing.
	const [only = null] = agreement.cases;
	const grammaticalCase = agreement.case
		? yield* answered.pick(agreement.case)
		: only;
	const cell = agreeingCell(
		agreement.cells,
		{ case: grammaticalCase, number, gender },
		{
			case: agreement.case ? answered.weights(agreement.case) : {},
			number: answered.weights(agreement.number),
			gender: answered.weights(agreement.gender),
		},
	);
	if (!cell)
		return {
			case: grammaticalCase,
			gender: gender === "Unmarked" || number === "Plur" ? null : gender,
			number,
		};
	return { case: cell.case, gender: cell.gender, number: cell.number };
});

/** What an agreeing word's block asked. */
export type AgreeingPlan = AgreementQuestions & {
	readonly inflects: ChoiceOf<typeof options.inflects>;
};

/** Asks whether an agreeing word inflects here, and its agreement. */
export function askAgreeing(
	questionnaire: Questionnaire,
	target: Target,
): AgreeingPlan {
	const inflects = questionnaire.choice(
		"inflects",
		question.inflects,
		options.inflects,
		["inflection"],
	);
	return { inflects, ...agreementQuestions(questionnaire, target) };
}

/** Reads an agreeing word's block: its agreement when it inflects here. */
export const readAgreeing = answerReader(function* (
	agreeing: AgreeingPlan,
	answered: Answered,
): ReaderBody<{
	readonly core: Record<string, never>;
	readonly inflection: Agreement | null;
}> {
	const inflects = (yield* answered.pick(agreeing.inflects)) === "Yes";
	return {
		core: {},
		inflection: inflects ? yield* readAgreement(agreeing, answered) : null,
	};
});
