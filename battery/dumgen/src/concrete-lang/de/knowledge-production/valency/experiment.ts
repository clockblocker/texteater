import { Effect } from "effect";
import { stableJson } from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import type { z } from "zod";
import {
	knowledgeComparison,
	markedContextEncounter,
} from "../../../../evaluation/knowledge-operation.js";
import type { DumgenOptions, KnowledgeInput } from "../../../../types.js";
import { createDumgen } from "../../../../universal/dumgen.js";
import { corpusSource, type inputSchema, outputSchema } from "./corpus.js";
import { evaluationCaseIds } from "./evaluation-ids.js";
import data from "./source-data.json";

type Frame = z.output<typeof outputSchema>["valency"];

const slots = (frame: Frame, withReferent: boolean) =>
	frame
		.map(({ status, complement }) => {
			const { referent, ...rest } = complement;
			return stableJson({
				status,
				...rest,
				...(withReferent ? { referent } : {}),
			});
		})
		.sort();

/**
 * The same Slots with the same statuses pass; referents and E-VALBU order
 * are reported beside the verdict.
 */
export function evaluateValencyFrame(output: Frame, idealOutput: Frame) {
	return {
		contractPass:
			stableJson(slots(output, false)) ===
			stableJson(slots(idealOutput, false)),
		referentPass:
			stableJson(slots(output, true)) ===
			stableJson(slots(idealOutput, true)),
		exactMatch: stableJson(output) === stableJson(idealOutput),
	};
}

/** Frame proposals through production Knowledge, requesting only `valency`. */
export function valencyOperationExperiment(
	options: DumgenOptions,
): OperationExperiment<
	typeof inputSchema,
	typeof outputSchema,
	ReturnType<typeof evaluateValencyFrame>
> {
	const corpus = corpusSource.goldenCorpus;
	if (!corpus) throw Error("Missing valency corpus");
	const demonstrations = corpus.select(data.demonstrationIds);
	return {
		corpus,
		demonstrations,
		evaluation: corpus.select(evaluationCaseIds).difference(demonstrations),
		run: async (input, { signal, recordTrace }) => {
			const request = { valency: null } as const;
			const result = await Effect.runPromise(
				Effect.either(
					createDumgen({
						...options,
						onOperation: (trace) => {
							recordTrace(trace);
							options.onOperation?.(trace);
						},
					}).produceKnowledge({
						encounter: markedContextEncounter(
							input.markedContext,
							input.reading.lemma,
						),
						reading: input.reading,
						request,
					} as KnowledgeInput),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			const [failure] = result.right.failures;
			if (failure) throw Error(`${failure.code}: ${failure.message}`);
			return outputSchema.parse({
				valency:
					knowledgeComparison(request, result.right).valency ?? [],
			});
		},
		evaluator: ({ output, idealOutput }) =>
			evaluateValencyFrame(output.valency, idealOutput.valency),
	};
}
