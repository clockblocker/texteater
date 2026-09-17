import { Effect } from "effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import { z } from "zod";
import {
	comparisonInputSchema,
	emojiDescriptionSchema,
} from "../../../generated/schemas.js";
import type { DumgenOptions } from "../../../types.js";
import { createDumgen } from "../../../universal/dumgen.js";
import {
	evaluateReadingMeaningIsolation,
	meaningIsolationCaseIds,
} from "./evaluator.js";
import { evaluationCaseIds as generateIds } from "./generate/evaluation-ids.js";
import generate from "./generate/source-data.json";
import cases from "./operation-cases.json";
import { evaluationCaseIds as resolveIds } from "./resolve/evaluation-ids.js";
import resolve from "./resolve/source-data.json";

const outputSchema = z.strictObject({
	decision: z.enum(["Reuse", "New"]),
	emojiDescription: emojiDescriptionSchema,
});
export function readingOperationExperiment(
	route: string,
	options: DumgenOptions,
): OperationExperiment<
	typeof comparisonInputSchema,
	typeof outputSchema,
	{ contractPass: boolean }
> {
	const data = route === generate.route ? generate : resolve;
	const corpus = defineGoldenCorpus({
		route,
		inputSchema: comparisonInputSchema,
		outputSchema,
		collections: {
			canonical: defineGoldenCaseCollection(import.meta.url, {
				cases: Object.fromEntries(
					Object.entries(cases)
						.filter(([id]) => Object.hasOwn(data.cases, id))
						.map(([id, example]) => [
							id,
							{
								...example,
								input: comparisonInputSchema.parse(
									example.input,
								),
								idealOutput: outputSchema.parse(
									example.idealOutput,
								),
							},
						]),
				),
			}),
		},
		fingerprintInput: (input) =>
			input.encounter.sentence.segments
				.map((segment) => segment.text)
				.join("")
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim()
				.toLocaleLowerCase("de"),
	});
	const demonstrations = corpus.select(data.demonstrationIds);
	return {
		corpus,
		demonstrations,
		evaluation: corpus
			.select(route === generate.route ? generateIds : resolveIds)
			.difference(demonstrations),
		run: async (input, { signal, recordTrace }) => {
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					recordTrace(trace);
					options.onOperation?.(trace);
				},
			});
			const result = await Effect.runPromise(
				Effect.either(
					dumgen.resolveOrGenerateReadingEmojiDescription(input),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			return outputSchema.parse(result.right);
		},
		evaluator: (args) =>
			meaningIsolationCaseIds.some((id) => id === args.caseId)
				? evaluateReadingMeaningIsolation({
						...args,
						input: {
							markedContext: "",
							lemma: args.input.lemma.canonicalForm,
							existingEmojiDescriptions: args.input.candidates,
						},
					})
				: {
						contractPass:
							stableJson(args.output) ===
							stableJson(args.idealOutput),
					},
	};
}
