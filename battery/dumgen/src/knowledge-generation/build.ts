import type { LemmaRoute, Reading } from "dumling/types";
import type { AiSdk } from "../ai-sdk/ai-sdk";
import { knowledgeGenerationPromptCatalog } from "../catalog/knowledge-generation-prompts";
import {
	buildGeneratorCatalog,
	type ModelExchange,
} from "../generator/generator";
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
	laboratory: {
		knowledge: {
			de: knowledgeGenerationPromptCatalog,
		},
	},
} as const;

export type KnowledgeDumgen = {
	readonly generate: {
		knowledge(
			language: KnowledgeGenerationLanguage,
			input: KnowledgeGenerationInput<"de">,
		): Promise<KnowledgeGenerationResult>;
	};
};

export function createKnowledgeDumgen(options: {
	readonly sdk: AiSdk;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
	readonly onDiagnostic?: (diagnostic: unknown) => void;
}): KnowledgeDumgen {
	const generators = buildGeneratorCatalog(
		KNOWLEDGE_PROMPT_CATALOG,
		options.sdk,
		{
			onModelExchange: options.onModelExchange,
			onDiagnostic: options.onDiagnostic,
		},
	);
	const knowledgeGenerators = generators.laboratory.knowledge.de;

	async function generateGermanKnowledge(
		validated: KnowledgeGenerationInput<"de">,
	): Promise<KnowledgeGenerationResult> {
		const family = validated.reading.lemma.family;
		const generate = knowledgeGenerators[family as GermanKnowledgeFamily];
		if (generate === undefined) {
			throw new DumgenError(
				"invalid-input",
				"Knowledge generation is not configured for this Family.",
				{
					cause: new TypeError(
						`Unsupported Knowledge Family: ${family}. Expected ${germanKnowledgeFamilies.join(" | ")}.`,
					),
				},
			);
		}
		return createGermanKnowledgeGeneration(generate)(validated);
	}

	async function knowledge(
		language: KnowledgeGenerationLanguage,
		input: KnowledgeGenerationInput<"de">,
	): Promise<KnowledgeGenerationResult> {
		if (language !== "de") {
			throw new DumgenError(
				"invalid-input",
				"Knowledge generation is not configured for this language.",
				{
					cause: new TypeError(
						`Unsupported Knowledge language: ${String(language)}.`,
					),
				},
			);
		}
		let validated: KnowledgeGenerationInput<"de">;
		try {
			validated = unwrapDumgenParse(
				parseAsKnowledgeGenerationInput(input, "de"),
			);
		} catch (cause) {
			throw new DumgenError(
				"invalid-input",
				"German Knowledge generation input is invalid.",
				{ cause },
			);
		}
		const route = {
			language: validated.reading.lemma.language,
			family: validated.reading.lemma.family,
			kind: validated.reading.lemma.kind,
		} as LemmaRoute;
		const { isClosedRouteFor } = await import("dumling");
		const { fixedKnowledgeFor } = await import("dumrel/fixed");
		if (
			fixedKnowledgeFor(validated.reading as unknown as Reading)
				.decision === "Found"
		) {
			return generateFixedKnowledge(validated);
		}
		return dispatchProduction({
			closed: isClosedRouteFor.reading(route),
			runClosed: async () => generateFixedKnowledge(validated),
			runOpen: async () => generateGermanKnowledge(validated),
		});
	}

	return Object.freeze({
		generate: Object.freeze({ knowledge }),
	});
}
