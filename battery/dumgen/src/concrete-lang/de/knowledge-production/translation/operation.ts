import { normalizeText } from "dumrel";
import type { z } from "zod";
import type { DumgenOptions } from "../../../../types.js";
import { DumgenFailure } from "../../../../universal/failure.js";
import { judgmentCaller } from "../../../../universal/judgment.js";
import {
	effectiveConfiguration,
	executeGeneration,
} from "../../../../universal/model.js";
import { choice } from "../../../../universal/questions.js";
import { operationTask, recordEvent } from "../../../../universal/trace.js";
import { translationAnalysisInputSchema } from "../structured-schemas.js";
export type TranslationResolution =
	| { decision: "Covered"; existingIndex: number; translation: string }
	| { decision: "Add"; translation: string };
/** Development-only translation coverage. Production Knowledge does not call this operation. */
export function resolveOrGenerateTranslation(
	options: DumgenOptions,
	raw: z.input<typeof translationAnalysisInputSchema>,
) {
	return operationTask(options)(
		"resolveOrGenerateTranslation",
		raw,
		async (signal): Promise<TranslationResolution> => {
			const parsed = translationAnalysisInputSchema.safeParse(raw);
			if (!parsed.success)
				throw new DumgenFailure(
					"InvalidInput",
					"resolveOrGenerateTranslation",
					parsed.error.message,
				);
			const input = parsed.data,
				candidates = input.existingTranslations,
				stage = "resolveOrGenerateTranslation",
				route = "knowledge-analysis/translation";
			if (candidates.length > 253)
				throw new DumgenFailure(
					"Unresolved",
					stage,
					"Complete translation candidates exceed the judgment budget",
					route,
				);
			if (candidates.length) {
				const result = await judgmentCaller(options)(
					stage,
					route,
					input,
					{
						coverage: choice(
							"Select the existing translation that covers this encounter of the fixed source Reading in the fixed target language. Near-equivalent wording or a concise paraphrase may cover it; lexical novelty alone does not require addition. Preserve useful polysemy, register, casing and punctuation. Polish is distinct from polish; Really? is distinct from Really!. Never reinterpret the source Reading or produce relations.",
							{
								...Object.fromEntries(
									candidates.map((text, index) => [
										`candidate_${index}`,
										text,
									]),
								),
								NoMatch:
									"No existing literal covers a useful contextual distinction",
								Unresolved:
									"Cannot defensibly select or decide no-match",
							} as Record<string, string>,
						),
					},
					signal,
				);
				const answer = result.answers.coverage;
				recordEvent(signal, "TranslationSelection", {
					candidates,
					answer,
				});
				if (answer.type !== "choice" || answer.choice === "Unresolved")
					throw new DumgenFailure(
						"Unresolved",
						stage,
						"Translation coverage is uncertain",
						route,
					);
				if (answer.choice !== "NoMatch") {
					const existingIndex = Number(
							answer.choice.slice("candidate_".length),
						),
						translation = candidates[existingIndex];
					if (translation === undefined)
						throw new DumgenFailure(
							"InvalidModelOutput",
							stage,
							"Unknown translation candidate",
							route,
						);
					return { decision: "Covered", existingIndex, translation };
				}
			} else
				recordEvent(signal, "EmptyTranslationCandidates", {
					candidates,
				});
			const translation = await executeGeneration(
				options,
				{
					stage,
					route,
					signal,
					configuration: effectiveConfiguration(options, route),
					input,
					systemPrompt:
						"Generate one concise target-language translation for the fixed source Reading in the supplied marked context. Preserve useful meaning, register, casing and punctuation. Supply text only, without coverage/addition labels, confidence, target Readings or Semantic Relations. Do not force novelty if the best valid text coincides with an existing translation. Return only {translation:string}.",
					outputSchema: {
						type: "object",
						properties: { translation: { type: "string" } },
						required: ["translation"],
						additionalProperties: false,
					},
				},
				(value) => {
					if (
						!value ||
						typeof value !== "object" ||
						Object.keys(value).length !== 1 ||
						!("translation" in value) ||
						typeof value.translation !== "string" ||
						!normalizeText(value.translation)
					)
						throw Error("Expected nonempty translation text only");
					return normalizeText(value.translation);
				},
			);
			const existingIndex = candidates.indexOf(translation);
			const result: TranslationResolution =
				existingIndex < 0
					? { decision: "Add", translation }
					: { decision: "Covered", existingIndex, translation };
			recordEvent(
				signal,
				existingIndex < 0
					? "GeneratedTranslation"
					: "GeneratedTranslationCollision",
				result,
			);
			return result;
		},
	);
}
