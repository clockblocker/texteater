import { Effect } from "effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import { z } from "zod";
import { targetsByLanguage } from "../../../generated/schemas.js";
import type { DumgenOptions } from "../../../types.js";
import { createDumgen } from "../../../universal/dumgen.js";
import { targetInputSchema } from "../model-schemas.js";
import { evaluationCaseIds } from "./evaluation-ids.js";
import data from "./source-data.json";

const outputSchema = z.union([
	targetsByLanguage.de,
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
const corpus = defineGoldenCorpus({
	route: data.route,
	inputSchema: targetInputSchema,
	outputSchema,
	collections: {
		canonical: defineGoldenCaseCollection(import.meta.url, {
			cases: Object.fromEntries(
				Object.entries(data.cases).map(([id, value]) => [
					id,
					{
						input: targetInputSchema.parse(value.input),
						idealOutput: outputSchema.parse(value.idealOutput),
					},
				]),
			),
		}),
	},
});
export function targetOperationExperiment(
	options: DumgenOptions,
): OperationExperiment<
	typeof targetInputSchema,
	typeof outputSchema,
	{ contractPass: boolean }
> {
	const demonstrations = corpus.select(data.demonstrationIds);
	return {
		corpus,
		demonstrations,
		evaluation: corpus.select(evaluationCaseIds).difference(demonstrations),
		run: async (input, { signal, recordTrace }) => {
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					options.onOperation?.(trace);
					recordTrace(trace);
				},
			});
			const result = await Effect.runPromise(
				Effect.either(
					dumgen.classifyTarget({
						sentence: {
							id: "evaluation",
							language: "de",
							segments: input.segments,
						},
						clickedSegmentIndex: input.clickedSegmentIndex,
					}),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			return outputSchema.parse(result.right);
		},
		evaluator: ({ output, idealOutput }) => ({
			contractPass: stableJson(output) === stableJson(idealOutput),
		}),
	};
}
