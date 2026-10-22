/**
 * Answers a doublets case's calls as gold would (#1260): Luna writes the
 * later Reading's gold forms, as `knowledge.produce`'s oracle does, and the
 * licence judge picks the selection of the forms it shows that gold holds,
 * so a pricing pass finds every request a run would send. It reads gold
 * only; no model.
 */
import type { Questions } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import { variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { selectionText } from "../../../src/knowledge/de/licence-judge.js";
import {
	dimensionParts,
	markerForms,
} from "../../../src/knowledge/de/licence-prompts.js";
import type { Answers } from "../../../src/segment/ask.js";
import { goldKnowledgeWritten, knowledgeOracle } from "../knowledge/oracle.js";
import type { GoldOracle } from "../resolve-grammar/models.js";
import type { LicenceCase } from "./cases.js";

/** One attempt's case: what the cache's oracle answers for. */
export type LicenceAttempt = { readonly licenceCase: LicenceCase };

/** The stored value a form the judge reads names: a form, or a marker by its description. */
const storedValueOf = (form: string) =>
	Object.entries(markerForms).find(([, text]) => text === form)?.[0] ?? form;

/** The forms of `shown` gold has the later Reading take as `part`, as shown. */
function goldTaken(
	licenceCase: LicenceCase,
	part: string,
	shown: readonly string[],
): string[] {
	const { lemma } = licenceCase.later.reading;
	const dimension = (
		Object.entries(dimensionParts) as [Dumrel.DimensionId, string][]
	).find(([, text]) => text === part)?.[0];
	if (dimension === undefined) return [];
	const gold = new Set(
		(licenceCase.later.gold.paradigm[dimension] ?? []).map((value) =>
			variantIdOf(lemma, dimension, value),
		),
	);
	return shown.filter((form) =>
		gold.has(variantIdOf(lemma, dimension, storedValueOf(form))),
	);
}

function goldLicenceAnswers(
	{ licenceCase }: LicenceAttempt,
	questions: Questions,
): Answers {
	const at = { goldCase: licenceCase.later, scope: "structural" } as const;
	const answers = knowledgeOracle.answers(at, questions);
	return Object.fromEntries(
		Object.entries(questions).map(([id, question]) => {
			const instructions = isRecord(question.instructions)
				? question.instructions
				: {};
			if (
				question.type !== "choice" ||
				!Array.isArray(instructions.forms)
			)
				return [id, answers[id]];
			const shown = instructions.forms.map(String);
			const part =
				typeof instructions.part === "string" ? instructions.part : "";
			const wanted = selectionText(goldTaken(licenceCase, part, shown));
			const options = Object.entries(question.criteria ?? {});
			const choice =
				options.find(([, text]) => text === wanted)?.[0] ??
				options[0]?.[0] ??
				"";
			return [
				id,
				{
					type: "choice",
					choice,
					confidence: 1,
					probabilities: { [choice]: 1 },
				},
			];
		}),
	) as Answers;
}

export const licenceOracle: GoldOracle<LicenceAttempt> = {
	answers: goldLicenceAnswers,
	written: ({ licenceCase }, input) =>
		goldKnowledgeWritten(
			{ goldCase: licenceCase.later, scope: "structural" },
			input,
		),
};
