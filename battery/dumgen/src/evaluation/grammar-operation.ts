import { Effect } from "effect";
import type { OperationExperiment } from "promptsmith/evaluation";
import type { z } from "zod";
import type { LinguisticCorpus } from "../concrete-lang/de/authoring.js";
import { grammarPromptRoutes } from "../generated/prompts.js";
import type { DumgenOptions, Segment } from "../types.js";
import { createDumgen } from "../universal/dumgen.js";
import { validateEncounter } from "../universal/validation.js";

/** Retained grammar corpora describe the operation projection, never a model response. */
export function grammarOperationExperiment(
	definition: {
		source: LinguisticCorpus;
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
	const corpus = definition.source.goldenCorpus;
	if (!corpus) throw Error("Missing grammar corpus");
	const key = Object.entries(grammarPromptRoutes).find(
		([, route]) => route === definition.source.route,
	)?.[0];
	if (!key) throw Error("Unknown grammar operation route");
	const [language, family, kind] = key.split("/");
	return {
		corpus,
		evaluation: definition.evaluation,
		demonstrations: corpus.select(
			definition.source.demonstrations &&
				"ids" in definition.source.demonstrations
				? definition.source.demonstrations.ids
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
				if (marked)
					segments.push({
						kind: "ResolvableText",
						text: chunk.slice(8, -9),
					});
				else
					for (const text of chunk.match(
						/\s+|[\p{L}\p{N}]+(?:[-‐‑'][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu,
					) ?? [])
						segments.push({
							kind: /^\s+$/u.test(text)
								? "Whitespace"
								: /^[\p{L}\p{N}]/u.test(text)
									? "ResolvableText"
									: "Punctuation",
							text,
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
				normalizedMembers:
					"articleEvidence" in attestation &&
					attestation.realizationCoverage === "Partial"
						? normalizedSurface.split(" ").slice(1)
						: normalizedSurface.split(" "),
				memberOrthographies: attestation.members.map(
					(member) => member.orthography,
				),
				realizationCoverage: attestation.realizationCoverage,
				...("articleEvidence" in attestation
					? { articleEvidence: attestation.articleEvidence }
					: {}),
			};
		},
	};
}
