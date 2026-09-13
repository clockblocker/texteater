import type { LemmaRoute, Reading } from "dumling-old/types";
import * as Effect from "effect/Effect";
import type { ModelGenerator } from "../ai-sdk/ai-sdk";
import { RUNTIME_KNOWLEDGE_PROMPT_CATALOG } from "../catalog/runtime-prompt-catalog";
import type { DumgenDomainFailure } from "../dumgen";
import { buildGeneratorCatalog } from "../generator/generator";
import { DumgenError } from "../generator/generator-error";
import {
	parseAsKnowledgeGenerationInput,
	unwrapDumgenParse,
} from "../parsing/lightweight-parsers";
import { dispatchProduction } from "../production/dispatcher";
import { generateFixedKnowledge } from "../production/fixed-knowledge";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationLanguage,
	KnowledgeGenerationResult,
} from "../types";
import {
	type GermanKnowledgeFamily,
	germanKnowledgeFamilies,
} from "./de/families";
import { createGermanKnowledgeGeneration } from "./de/runtime";

const KNOWLEDGE_PROMPT_CATALOG = {
	laboratory: { knowledge: { de: RUNTIME_KNOWLEDGE_PROMPT_CATALOG } },
} as const;
type KnowledgeFailure =
	| DumgenError
	| DumgenDomainFailure<
			Extract<
				KnowledgeGenerationResult,
				{ readonly decision: "CatalogMiss" }
			>
	  >;

export type KnowledgeDumgen = {
	readonly generate: {
		knowledge(
			language: KnowledgeGenerationLanguage,
			input: KnowledgeGenerationInput<"de">,
		): Effect.Effect<
			Exclude<
				KnowledgeGenerationResult,
				{ readonly decision: "CatalogMiss" }
			>,
			KnowledgeFailure
		>;
	};
};

export function createKnowledgeDumgen(options: {
	readonly modelGenerator: ModelGenerator;
}): KnowledgeDumgen {
	const generators = buildGeneratorCatalog(
		KNOWLEDGE_PROMPT_CATALOG,
		options.modelGenerator,
	);
	const knowledgeGenerators = generators.laboratory.knowledge.de;
	const generateGermanKnowledge = (
		validated: KnowledgeGenerationInput<"de">,
	): Effect.Effect<KnowledgeGenerationResult, DumgenError> => {
		const family = validated.reading.lemma.family;
		const generate = knowledgeGenerators[family as GermanKnowledgeFamily];
		if (generate === undefined)
			return Effect.fail(
				new DumgenError(
					"invalid-input",
					"Knowledge generation is not configured for this Family.",
					{
						cause: new TypeError(
							`Unsupported Knowledge Family: ${family}. Expected ${germanKnowledgeFamilies.join(" | ")}.`,
						),
					},
				),
			);
		return createGermanKnowledgeGeneration(generate)(validated);
	};
	const knowledge = (
		language: KnowledgeGenerationLanguage,
		input: KnowledgeGenerationInput<"de">,
	): Effect.Effect<KnowledgeGenerationResult, DumgenError> =>
		Effect.gen(function* () {
			if (language !== "de")
				return yield* Effect.fail(
					new DumgenError(
						"invalid-input",
						"Knowledge generation is not configured for this language.",
						{
							cause: new TypeError(
								`Unsupported Knowledge language: ${String(language)}.`,
							),
						},
					),
				);
			const validated = yield* Effect.try({
				try: () =>
					unwrapDumgenParse(
						parseAsKnowledgeGenerationInput(input, "de"),
					),
				catch: (cause) =>
					new DumgenError(
						"invalid-input",
						"German Knowledge generation input is invalid.",
						{ cause },
					),
			});
			const route = {
				language: validated.reading.lemma.language,
				family: validated.reading.lemma.family,
				kind: validated.reading.lemma.kind,
			} as LemmaRoute;
			const { isClosedRouteFor } = yield* Effect.promise(
				() => import("dumling-old"),
			);
			const { fixedKnowledgeFor } = yield* Effect.promise(
				() => import("dumrel/fixed"),
			);
			if (
				fixedKnowledgeFor(validated.reading as unknown as Reading)
					.decision === "Found"
			)
				return yield* generateFixedKnowledge(validated);
			return yield* dispatchProduction({
				closed: isClosedRouteFor.reading(route),
				runClosed: () => generateFixedKnowledge(validated),
				runOpen: () => generateGermanKnowledge(validated),
			});
		});
	const completeKnowledge: KnowledgeDumgen["generate"]["knowledge"] = (
		language,
		input,
	) =>
		knowledge(language, input).pipe(
			Effect.flatMap((result) => {
				if ("decision" in result && result.decision === "CatalogMiss") {
					return Effect.fail({
						_tag: "DumgenDomainFailure" as const,
						result: result as Extract<
							KnowledgeGenerationResult,
							{ readonly decision: "CatalogMiss" }
						>,
					});
				}
				return Effect.succeed(
					result as Exclude<
						KnowledgeGenerationResult,
						{ readonly decision: "CatalogMiss" }
					>,
				);
			}),
		);
	return Object.freeze({
		generate: Object.freeze({ knowledge: completeKnowledge }),
	});
}
