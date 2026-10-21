/**
 * Answers a doublets case's calls as gold would (#1230): the licence judge
 * takes exactly the stored variants the later Reading's gold forms hold,
 * and Luna writes its gold forms, as `knowledge.produce`'s oracle does, so
 * a pricing pass finds every request a run would send. It reads gold only;
 * no model.
 */
import type { Questions } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import { variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";
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

/** The stored value a judge question names: a form, or a marker by its description. */
const storedValueOf = (form: string) =>
	Object.entries(markerForms).find(([, text]) => text === form)?.[0] ?? form;

/** Whether gold has the later Reading take `form` as `part`. */
function goldTakes(
	licenceCase: LicenceCase,
	part: string,
	form: string,
): boolean {
	const { lemma } = licenceCase.later.reading;
	const dimension = (
		Object.entries(dimensionParts) as [Dumrel.DimensionId, string][]
	).find(([, text]) => text === part)?.[0];
	if (dimension === undefined) return false;
	const id = variantIdOf(lemma, dimension, storedValueOf(form));
	return (licenceCase.later.gold.paradigm[dimension] ?? []).some(
		(gold) => variantIdOf(lemma, dimension, gold) === id,
	);
}

function goldLicenceAnswers(
	{ licenceCase }: LicenceAttempt,
	questions: Questions,
): Answers {
	const at = { goldCase: licenceCase.later, scope: "structural" } as const;
	const choices = knowledgeOracle.answers(at, questions);
	return Object.fromEntries(
		Object.entries(questions).map(([id, question]) => {
			if (question.type !== "noul") return [id, choices[id]];
			const { part, form } = isRecord(question.instructions)
				? question.instructions
				: {};
			const takes = goldTakes(licenceCase, String(part), String(form));
			return [id, { type: "noul", noul: takes ? 1 : 0 }];
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
