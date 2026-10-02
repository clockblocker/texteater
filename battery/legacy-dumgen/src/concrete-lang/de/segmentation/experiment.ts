import { Effect } from "effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import { z } from "zod";
import type { DumgenOptions, SegmentationDecision } from "../../../types.js";
import { createDumgen } from "../../../universal/dumgen.js";
import { segmentInputSchema } from "../../../universal/schemas.js";
import data from "./operation-cases.json";

const outputSchema = z.array(
	z.union([
		z.strictObject({
			decision: z.literal("Accepted"),
			language: z.enum(["de", "en", "he"]),
			stitchedText: z.string(),
		}),
		z.strictObject({
			decision: z.enum(["Unintelligible", "UnsupportedLanguage"]),
		}),
	]),
);
export function projectSegmentation(
	decisions: readonly SegmentationDecision[],
) {
	return decisions.map((item) =>
		item.decision === "Accepted"
			? {
					decision: item.decision,
					language: item.language,
					stitchedText: item.sentence.segments
						.map((segment) => segment.text)
						.join(""),
				}
			: { decision: item.decision },
	);
}
const corpus = defineGoldenCorpus({
	route: "intake",
	inputSchema: segmentInputSchema,
	outputSchema,
	collections: {
		canonical: defineGoldenCaseCollection(import.meta.url, {
			cases: Object.fromEntries(
				Object.entries(data).map(([id, example]) => [
					id,
					{
						input: segmentInputSchema.parse(example.input),
						idealOutput: outputSchema.parse(example.idealOutput),
					},
				]),
			),
		}),
	},
});
export function intakeOperationExperiment(
	options: DumgenOptions,
): OperationExperiment<
	typeof segmentInputSchema,
	typeof outputSchema,
	{ contractPass: boolean }
> {
	return {
		corpus,
		demonstrations: corpus.select([]),
		evaluation: corpus.select(Object.keys(data)),
		run: async (input, { signal, recordTrace }) => {
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					recordTrace(trace);
					options.onOperation?.(trace);
				},
			});
			const result = await Effect.runPromise(
				Effect.either(dumgen.segment(input)),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			return projectSegmentation(result.right);
		},
		evaluator: ({ output, idealOutput }) => ({
			contractPass: stableJson(output) === stableJson(idealOutput),
		}),
	};
}
