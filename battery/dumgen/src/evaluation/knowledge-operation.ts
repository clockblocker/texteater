import { Effect } from "effect";
import type { PromptSource } from "promptsmith";
import { defineGoldenCaseCollection, defineGoldenCorpus } from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import { z } from "zod";
import {
	knowledgeInputSchema,
	knowledgeOutputSchema,
} from "../concrete-lang/de/model-schemas.js";
import type {
	DumgenOptions,
	KnowledgeProduction,
	KnowledgeRequest,
} from "../types.js";
import { createDumgen } from "../universal/dumgen.js";
import { knowledgeFailureSchema } from "../universal/schemas.js";
import { validateEncounter } from "../universal/validation.js";

type Definition = {
	promptSource: PromptSource;
	evaluation: OperationExperiment<
		z.ZodType,
		z.ZodType,
		unknown
	>["evaluation"];
	evaluator: OperationExperiment<z.ZodType, z.ZodType, unknown>["evaluator"];
};
/** A comparison projection only. Complete domain changes and failures remain in the operation trace. */
export function knowledgeComparison(
	request: KnowledgeRequest,
	production: KnowledgeProduction,
): z.output<typeof knowledgeOutputSchema> {
	const result: Record<string, unknown> = {};
	for (const [aspect, value] of Object.entries(request))
		result[aspect] =
			value === null
				? null
				: Object.fromEntries(
						Object.keys(value).map((key) => [key, null]),
					);
	for (const change of production.changes) {
		if (change.kind !== "Contribute") continue;
		if (change.aspect === "definition" || change.aspect === "transcription")
			result[change.aspect] = change.value;
		if (change.aspect === "translations")
			(result.translations as Record<string, unknown>)[change.language] =
				change.value[0] ?? null;
		if (change.aspect === "semanticRelations") {
			const targets = change.value
				.map((target) => ("lemma" in target ? target.lemma : target))
				.map((lemma) => ({
					canonicalForm: lemma.canonicalForm,
					kind: lemma.kind,
				}));
			(result.semanticRelations as Record<string, unknown>)[
				change.relation
			] = targets.length ? targets : null;
		}
	}
	for (const pending of production.pendingRelations) {
		const relations = result.semanticRelations as Record<string, unknown>;
		relations[pending.relation] = [
			...((relations[pending.relation] as unknown[]) ?? []),
			{
				canonicalForm: pending.target.canonicalForm,
				kind: pending.target.kind,
			},
		];
	}
	return knowledgeOutputSchema.parse(result);
}
export function knowledgeOperationExperiment(
	definition: Definition,
	options: DumgenOptions,
): OperationExperiment<z.ZodType, z.ZodType, unknown> {
	const original = definition.promptSource.goldenCorpus;
	if (!original) throw Error("Missing Knowledge corpus");
	const outputSchema = knowledgeOutputSchema.extend({
		failures: z.array(knowledgeFailureSchema),
	});
	const corpus = defineGoldenCorpus({
		route: definition.promptSource.route,
		inputSchema: knowledgeInputSchema,
		outputSchema,
		collections: {
			canonical: defineGoldenCaseCollection(import.meta.url, {
				cases: Object.fromEntries(
					Object.entries(original.cases).map(([id, example]) => [
						id,
						{
							...example,
							input: knowledgeInputSchema.parse(example.input),
							idealOutput: outputSchema.parse({
								...(example.idealOutput as object),
								failures: [],
							}),
						},
					]),
				),
			}),
		},
		fingerprintInput: (input) =>
			input.markedContext
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim()
				.toLocaleLowerCase("de"),
	});
	const demoIds =
		definition.promptSource.demonstrations &&
		"ids" in definition.promptSource.demonstrations
			? definition.promptSource.demonstrations.ids
			: [];
	return {
		corpus,
		demonstrations: corpus.select(demoIds),
		evaluation: corpus.select(definition.evaluation.ids),
		run: async (raw, { signal, recordTrace }) => {
			const input = knowledgeInputSchema.parse(raw),
				segments: {
					kind: "OpaqueText" | "ResolvableText";
					text: string;
				}[] = [],
				memberSegmentIndices: number[] = [];
			for (const part of input.markedContext.split(
				/(<TARGET>.*?<\/TARGET>)/gu,
			)) {
				if (!part) continue;
				const marked = part.startsWith("<TARGET>");
				if (marked) memberSegmentIndices.push(segments.length);
				segments.push({
					kind: marked ? "ResolvableText" : "OpaqueText",
					text: marked ? part.slice(8, -9) : part,
				});
			}
			const encounter = validateEncounter({
				sentence: {
					id: "evaluation",
					language: input.reading.lemma.language,
					segments,
				},
				target: {
					family: input.reading.lemma.family,
					kind: input.reading.lemma.kind,
					memberSegmentIndices,
				},
			});
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					recordTrace(trace);
					options.onOperation?.(trace);
				},
			});
			const result = await Effect.runPromise(
				Effect.either(
					dumgen.produceKnowledge({
						encounter,
						reading: input.reading,
						request: input.request,
					} as import("../types.js").KnowledgeInput),
				),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			return {
				...knowledgeComparison(input.request, result.right),
				failures: [...result.right.failures],
			};
		},
		evaluator: (args) => {
			const { failures, ...output } = outputSchema.parse(args.output);
			const { failures: _expectedFailures, ...idealOutput } =
				outputSchema.parse(args.idealOutput);
			const evaluated = definition.evaluator({
				...args,
				output,
				idealOutput,
			}) as { contractPass: boolean };
			return {
				...evaluated,
				contractPass: evaluated.contractPass && failures.length === 0,
				partialFailures: failures,
			};
		},
	};
}
