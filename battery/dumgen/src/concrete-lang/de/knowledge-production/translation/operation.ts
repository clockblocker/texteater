import { normalizeText } from "dumrel";
import * as Effect from "effect/Effect";
import type { z } from "zod";
import type { DumgenOptions } from "../../../../types.js";
import { DumgenFailure } from "../../../../universal/failure.js";
import { judgmentCaller } from "../../../../universal/judgment.js";
import { executeGeneration } from "../../../../universal/model.js";
import { effectiveConfiguration } from "../../../../universal/model-configuration.js";
import { choice } from "../../../../universal/questions.js";
import { operation, recordEvent } from "../../../../universal/trace.js";
import { translationAnalysisInputSchema } from "../structured-schemas.js";
export type TranslationResolution =
	| { decision: "Covered"; existingIndex: number; translation: string }
	| { decision: "Add"; translation: string };
/** Development-only translation coverage. Production Knowledge does not call this operation. */
export function resolveOrGenerateTranslation(
	options: DumgenOptions,
	raw: z.input<typeof translationAnalysisInputSchema>,
) {
	return operation(options)("resolveOrGenerateTranslation", raw, (scope) =>
		Effect.gen(function* () {
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
			// Generation follows only a NoMatch selection, so it depends on it.
			let selection: string[] = [];
			if (candidates.length) {
				const judged = yield* judgmentCaller(options)(
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
					scope,
					[],
				);
				selection = [judged.id];
				const answer = judged.output.answers.coverage;
				recordEvent(scope, "TranslationSelection", {
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
					return {
						decision: "Covered",
						existingIndex,
						translation,
					} as TranslationResolution;
				}
			} else
				recordEvent(scope, "EmptyTranslationCandidates", {
					candidates,
				});
			const { output: translation } = yield* executeGeneration(
				options,
				scope,
				{
					stage,
					route,
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
						throw new DumgenFailure(
							"InvalidModelOutput",
							stage,
							"Expected nonempty translation text only",
							route,
						);
					return normalizeText(value.translation);
				},
				selection,
			);
			const existingIndex = candidates.indexOf(translation);
			const result: TranslationResolution =
				existingIndex < 0
					? { decision: "Add", translation }
					: { decision: "Covered", existingIndex, translation };
			recordEvent(
				scope,
				existingIndex < 0
					? "GeneratedTranslation"
					: "GeneratedTranslationCollision",
				result,
			);
			return result;
		}),
	);
}
