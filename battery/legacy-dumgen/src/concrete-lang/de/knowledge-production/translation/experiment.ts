import { Effect } from "effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import { z } from "zod";
import type { DumgenOptions } from "../../../../types.js";
import { translationAnalysisInputSchema as inputSchema } from "../structured-schemas.js";
import { evaluationCaseIds } from "./evaluation-ids.js";
import { resolveOrGenerateTranslation } from "./operation.js";
import data from "./source-data.json";

const outputSchema = z.discriminatedUnion("decision", [
	z.strictObject({
		decision: z.literal("Covered"),
		existingIndex: z.number().int().nonnegative(),
		translation: z.string().min(1),
	}),
	z.strictObject({
		decision: z.literal("Add"),
		translation: z.string().min(1),
	}),
]);
const corpus = defineGoldenCorpus({
	route: data.route,
	inputSchema,
	outputSchema,
	collections: {
		canonical: defineGoldenCaseCollection(import.meta.url, {
			cases: Object.fromEntries(
				Object.entries(data.cases).map(([id, example]) => [
					id,
					{
						...example,
						input: inputSchema.parse(example.input),
						idealOutput: outputSchema.parse(
							"existingIndex" in example.idealOutput
								? {
										...example.idealOutput,
										translation:
											example.input.existingTranslations[
												example.idealOutput
													.existingIndex
											],
									}
								: example.idealOutput,
						),
					},
				]),
			),
		}),
	},
	fingerprintInput: (input) =>
		input.markedContext.normalize("NFC").replaceAll(/\s+/gu, " ").trim(),
});
export function translationOperationExperiment(
	options: DumgenOptions,
): OperationExperiment<
	typeof inputSchema,
	typeof outputSchema,
	{ contractPass: boolean }
> {
	const demonstrations = corpus.select(data.demonstrationIds);
	return {
		corpus,
		demonstrations,
		evaluation: corpus.select(evaluationCaseIds).difference(demonstrations),
		run: async (input, { signal, recordTrace }) => {
			const result = await Effect.runPromise(
				Effect.either(
					resolveOrGenerateTranslation(
						{
							...options,
							onOperation: (trace) => {
								recordTrace(trace);
								options.onOperation?.(trace);
							},
						},
						input,
					),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			return result.right;
		},
		evaluator: ({ output, idealOutput }) => ({
			contractPass: stableJson(output) === stableJson(idealOutput),
		}),
	};
}
