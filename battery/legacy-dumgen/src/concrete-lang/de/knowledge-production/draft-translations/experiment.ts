import { Effect } from "effect";
import { stableJson } from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import type { z } from "zod";
import { markedContextEncounter } from "../../../../evaluation/knowledge-operation.js";
import type { DumgenOptions } from "../../../../types.js";
import { draftKnowledge } from "../draft.js";
import { corpusSource, type inputSchema, outputSchema } from "./corpus.js";
import { evaluationCaseIds } from "./evaluation-ids.js";
import data from "./source-data.json";

type Language = "en" | "ru";
type Reviewed = {
	readonly accepted: Readonly<Record<Language, readonly string[]>>;
	readonly rejected: Readonly<Record<Language, readonly string[]>>;
};
/** Reviewed answers beside each ideal; neither list is exhaustive. */
export const reviewedAlternatives = data.reviewedAlternatives as Readonly<
	Record<string, Reviewed>
>;
type Verdict = "Accepted" | "Rejected" | "Missing" | "Unreviewed";

function sameText(left: string, right: string) {
	const normalize = (text: string) =>
		text
			.normalize("NFC")
			.replaceAll("’", "'")
			.trim()
			.replace(/[.!?]+$/u, "")
			.toLocaleLowerCase();
	return normalize(left) === normalize(right);
}

/** A known rejected or missing leaf fails; an unlisted one needs review. */
export function evaluateDraftTranslations(
	caseId: string,
	output: z.output<typeof outputSchema>,
	idealOutput: z.output<typeof outputSchema>,
) {
	const reviewed = reviewedAlternatives[caseId];
	const languages: Partial<Record<Language, Verdict>> = {};
	for (const [language, ideal] of Object.entries(
		idealOutput.translations,
	) as [Language, string | null][]) {
		if (ideal === null) continue;
		const text = output.translations[language] ?? null;
		const matches = (values: readonly string[]) =>
			text !== null && values.some((value) => sameText(value, text));
		languages[language] =
			text === null
				? "Missing"
				: matches([ideal, ...(reviewed?.accepted[language] ?? [])])
					? "Accepted"
					: matches(reviewed?.rejected[language] ?? [])
						? "Rejected"
						: "Unreviewed";
	}
	const verdicts = Object.values(languages);
	const failed = verdicts.some(
		(verdict) => verdict === "Rejected" || verdict === "Missing",
	);
	const recognized = verdicts.every((verdict) => verdict === "Accepted");
	return {
		contractPass: failed ? false : recognized ? true : null,
		needsReview: !failed && !recognized,
		exactMatch: stableJson(output) === stableJson(idealOutput),
		languages,
	};
}

/** Draft-mode translations: the concurrent draftKnowledge call tf-demo publishes from. */
export function draftTranslationOperationExperiment(
	options: DumgenOptions,
): OperationExperiment<
	typeof inputSchema,
	typeof outputSchema,
	ReturnType<typeof evaluateDraftTranslations>
> {
	const corpus = corpusSource.goldenCorpus;
	if (!corpus) throw Error("Missing draft translation corpus");
	const demonstrations = corpus.select(data.demonstrationIds);
	return {
		corpus,
		demonstrations,
		evaluation: corpus.select(evaluationCaseIds).difference(demonstrations),
		run: async (input, { signal, recordTrace }) => {
			const result = await Effect.runPromise(
				Effect.either(
					draftKnowledge(
						{
							...options,
							onOperation: (trace) => {
								recordTrace(trace);
								options.onOperation?.(trace);
							},
						},
						{
							encounter: markedContextEncounter(
								input.markedContext,
								input.lemma,
							),
							lemma: input.lemma,
							request: input.request,
						},
					),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			const drafted = result.right.texts;
			return outputSchema.parse({
				translations: Object.fromEntries(
					Object.keys(input.request.translations).map((language) => [
						language,
						drafted.find(
							(text) =>
								text.aspect === "translations" &&
								text.language === language,
						)?.text ?? null,
					]),
				),
			});
		},
		evaluator: ({ caseId, output, idealOutput }) =>
			evaluateDraftTranslations(caseId, output, idealOutput),
	};
}
