import { Effect } from "effect";
import type { PromptSource } from "promptsmith";
import type { OperationExperiment } from "promptsmith/evaluation";
import type { z } from "zod";
import { grammarPromptRoutes } from "../generated/prompts.js";
import type { DumgenOptions, Segment } from "../types.js";
import { createDumgen } from "../universal/dumgen.js";
import { validateEncounter } from "../universal/validation.js";

/** Retained grammar corpora describe the operation projection, never a model response. */
export function grammarOperationExperiment(
	definition: {
		promptSource: PromptSource;
		evaluation: OperationExperiment<
			z.ZodType,
			z.ZodType,
			unknown
		>["evaluation"];
		evaluator: OperationExperiment<
			z.ZodType,
			z.ZodType,
			unknown
		>["evaluator"];
	},
	options: DumgenOptions,
): OperationExperiment<z.ZodType, z.ZodType, unknown> {
	const corpus = definition.promptSource.goldenCorpus;
	if (!corpus) throw Error("Missing grammar corpus");
	const key = Object.entries(grammarPromptRoutes).find(
		([, route]) => route === definition.promptSource.route,
	)?.[0];
	if (!key) throw Error("Unknown grammar operation route");
	const [language, family, kind] = key.split("/");
	return {
		corpus,
		evaluation: definition.evaluation,
		demonstrations: corpus.select(
			definition.promptSource.demonstrations &&
				"ids" in definition.promptSource.demonstrations
				? definition.promptSource.demonstrations.ids
				: [],
		),
		evaluator: definition.evaluator,
		run: async (raw, { signal, recordTrace }) => {
			const input = raw as { markedContext: string; members: string[] };
			const segments: Segment[] = [],
				members: number[] = [];
			for (const chunk of input.markedContext.split(
				/(<TARGET>.*?<\/TARGET>)/gu,
			)) {
				if (!chunk) continue;
				const marked = chunk.startsWith("<TARGET>");
				if (marked) members.push(segments.length);
				segments.push({
					kind: marked ? "ResolvableText" : "OpaqueText",
					text: marked ? chunk.slice(8, -9) : chunk,
				});
			}
			if (
				members.some(
					(position, index) =>
						segments[position]?.text !== input.members[index],
				) ||
				members.length !== input.members.length
			)
				throw Error(
					"Corpus member alignment differs from its marked context",
				);
			const encounter = validateEncounter({
				sentence: { id: "evaluation", language, segments },
				target: { family, kind, memberSegmentIndices: members },
			});
			const dumgen = createDumgen({
				...options,
				onOperation: (trace) => {
					recordTrace(trace);
					options.onOperation?.(trace);
				},
			});
			const result = await Effect.runPromise(
				Effect.either(dumgen.resolveGrammar(encounter)),
				{ signal },
			);
			if (result._tag === "Left") throw result.left;
			const attestation = result.right;
			const {
				lemma,
				normalizedSurface,
				unitKind: _unit,
				language: _language,
				...surface
			} = attestation.surface;
			return {
				lemma: {
					canonicalForm: lemma.canonicalForm,
					coreFeatures: lemma.coreFeatures,
				},
				surface,
				normalizedMembers: normalizedSurface.split(" "),
				memberOrthographies: attestation.members.map(
					(member) => member.orthography,
				),
				realizationCoverage: attestation.realizationCoverage,
			};
		},
	};
}
