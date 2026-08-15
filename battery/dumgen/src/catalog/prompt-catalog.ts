import { DUMGEN_GENERATION_MODEL } from "../ai-sdk/model-policy";
import {
	assertIntakeBatch,
	freezeIntakeBatch,
	type IntakeBatch,
} from "../intake/contracts";
import { systemPrompt as intakeSystemPrompt } from "../promptsmith/production/generated-system-prompt/intake";
import { systemPrompt as lexicalResolutionSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/lexical-breakdown/resolution";
import { systemPrompt as lexicalSegmentationSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/lexical-breakdown/segmentation";
import { systemPrompt as morphologicalResolutionSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/morphological-tree/resolution";
import { systemPrompt as morphologicalSegmentationSystemPrompt } from "../promptsmith/production/generated-system-prompt/knowledge-analysis/morphological-tree/segmentation";
import { systemPrompt as readingSystemPrompt } from "../promptsmith/production/generated-system-prompt/reading-resolution/de";
import { systemPrompt as targetSystemPrompt } from "../promptsmith/production/generated-system-prompt/target-classification/de/high-level-whole-unit";
import { systemPrompt as unitShadowClassificationSystemPrompt } from "../promptsmith/production/generated-system-prompt/unit-shadow-classification";
import {
	inputSchema as intakeInputSchema,
	outputSchema as intakeOutputSchema,
} from "../promptsmith/production/intake/schemas";
import {
	lexicalResolutionInputSchema,
	lexicalResolutionOutputSchema,
	lexicalSegmentationInputSchema,
	lexicalSegmentationOutputSchema,
	morphologicalResolutionInputSchema,
	morphologicalResolutionOutputSchema,
	morphologicalSegmentationInputSchema,
	morphologicalSegmentationOutputSchema,
} from "../promptsmith/production/knowledge-analysis/schemas";
import {
	additionalIndicesAdapter,
	projectClassificationInput,
	inputSchema as targetInputSchema,
	modelInputSchema as targetModelInputSchema,
	outputSchema as targetOutputSchema,
} from "../promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit";
import {
	inputSchema as readingModelInputSchema,
	outputSchema as readingOutputSchema,
} from "../promptsmith/production/reading-resolution/de/schemas";
import {
	inputSchema as unitShadowClassificationInputSchema,
	outputSchema as unitShadowClassificationOutputSchema,
} from "../promptsmith/production/unit-shadow-classification/schemas";
import { assertSupportedUnitShadowClassification } from "../schema/unit-shadow-classification";
import type { AnalysisTarget, ReadingResolution, Unresolved } from "../types";
import { DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS } from "./laboratory/de-authored-grammatical-resolution-prompts";
import type { Prompt, PromptCatalogEntry } from "./prompt-definition";

export type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "./prompt-definition";

const intakePrompt = {
	systemPrompt: intakeSystemPrompt,
	inputSchema: intakeInputSchema,
	outputSchema: intakeOutputSchema,
	outputPostcondition: {
		assert(input, generated) {
			assertIntakeBatch(input, generated);
		},
	},
	projectOutput(_input, generated): IntakeBatch {
		return freezeIntakeBatch(generated);
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 2048 },
} satisfies Prompt<
	typeof intakeInputSchema,
	typeof intakeOutputSchema,
	IntakeBatch
>;

const targetPrompt = {
	systemPrompt: targetSystemPrompt,
	inputSchema: targetInputSchema,
	modelInputSchema: targetModelInputSchema,
	outputSchema: targetOutputSchema,
	projectInput(input) {
		return projectClassificationInput(input).input;
	},
	outputPostcondition: {
		assert(input, generated) {
			canonicalizeTargetClassification(input, generated);
		},
	},
	projectOutput(input, generated): AnalysisTarget | Unresolved {
		const canonical = canonicalizeTargetClassification(input, generated);
		if (canonical.decision === "Unresolved") {
			return { decision: "Unresolved" };
		}
		return canonical.target as AnalysisTarget;
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof targetInputSchema,
	typeof targetOutputSchema,
	AnalysisTarget | Unresolved,
	typeof targetModelInputSchema
>;

function canonicalizeTargetClassification(
	input: Parameters<typeof projectClassificationInput>[0],
	generated: Parameters<
		typeof additionalIndicesAdapter.canonicalize
	>[0]["output"],
) {
	return additionalIndicesAdapter.canonicalize({
		canonicalInput: input,
		privateInput: projectClassificationInput(input).input,
		output: generated,
	});
}

const readingPrompt = {
	systemPrompt: readingSystemPrompt,
	inputSchema: readingModelInputSchema,
	outputSchema: readingOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 192 },
} satisfies Prompt<
	typeof readingModelInputSchema,
	typeof readingOutputSchema,
	ReadingResolution
>;

const unitShadowClassificationPrompt = {
	systemPrompt: unitShadowClassificationSystemPrompt,
	inputSchema: unitShadowClassificationInputSchema,
	outputSchema: unitShadowClassificationOutputSchema,
	outputPostcondition: {
		assert(input, generated) {
			assertSupportedUnitShadowClassification(input, generated);
		},
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 128 },
} satisfies Prompt<
	typeof unitShadowClassificationInputSchema,
	typeof unitShadowClassificationOutputSchema
>;

const morphologicalSegmentationPrompt = {
	systemPrompt: morphologicalSegmentationSystemPrompt,
	inputSchema: morphologicalSegmentationInputSchema,
	outputSchema: morphologicalSegmentationOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 4096 },
} satisfies Prompt<
	typeof morphologicalSegmentationInputSchema,
	typeof morphologicalSegmentationOutputSchema
>;

const morphologicalResolutionPrompt = {
	systemPrompt: morphologicalResolutionSystemPrompt,
	inputSchema: morphologicalResolutionInputSchema,
	outputSchema: morphologicalResolutionOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 4096 },
} satisfies Prompt<
	typeof morphologicalResolutionInputSchema,
	typeof morphologicalResolutionOutputSchema
>;

const lexicalSegmentationPrompt = {
	systemPrompt: lexicalSegmentationSystemPrompt,
	inputSchema: lexicalSegmentationInputSchema,
	outputSchema: lexicalSegmentationOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 3072 },
} satisfies Prompt<
	typeof lexicalSegmentationInputSchema,
	typeof lexicalSegmentationOutputSchema
>;

const lexicalResolutionPrompt = {
	systemPrompt: lexicalResolutionSystemPrompt,
	inputSchema: lexicalResolutionInputSchema,
	outputSchema: lexicalResolutionOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 3072 },
} satisfies Prompt<
	typeof lexicalResolutionInputSchema,
	typeof lexicalResolutionOutputSchema
>;

function promptEntry<Definition extends Prompt>(
	prompt: Definition,
): PromptCatalogEntry<Definition> {
	return { meta: { kind: "prompt" }, prompt };
}

function promptEntries<const Prompts extends Readonly<Record<string, Prompt>>>(
	prompts: Prompts,
): { readonly [Key in keyof Prompts]: PromptCatalogEntry<Prompts[Key]> } {
	return Object.fromEntries(
		Object.entries(prompts).map(([kind, prompt]) => [
			kind,
			promptEntry(prompt),
		]),
	) as { readonly [Key in keyof Prompts]: PromptCatalogEntry<Prompts[Key]> };
}

const grammaticalResolutionCatalog = {
	Lexeme: promptEntries(DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Lexeme),
	Phraseme: promptEntries(
		DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Phraseme,
	),
	Construction: promptEntries(
		DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Construction,
	),
};

export type LaboratoryPromptCatalog = {
	readonly laboratory: {
		readonly intake: PromptCatalogEntry<typeof intakePrompt>;
		readonly targetClassification: {
			readonly de: {
				readonly highLevelWholeUnit: PromptCatalogEntry<
					typeof targetPrompt
				>;
			};
		};
		readonly grammaticalResolution: {
			readonly de: typeof grammaticalResolutionCatalog;
		};
		readonly readingResolution: {
			readonly de: PromptCatalogEntry<typeof readingPrompt>;
		};
		readonly unitShadowClassification: PromptCatalogEntry<
			typeof unitShadowClassificationPrompt
		>;
		readonly knowledge: {
			readonly morphologicalTree: {
				readonly segmentation: PromptCatalogEntry<
					typeof morphologicalSegmentationPrompt
				>;
				readonly resolution: PromptCatalogEntry<
					typeof morphologicalResolutionPrompt
				>;
			};
			readonly lexicalBreakdown: {
				readonly segmentation: PromptCatalogEntry<
					typeof lexicalSegmentationPrompt
				>;
				readonly resolution: PromptCatalogEntry<
					typeof lexicalResolutionPrompt
				>;
			};
		};
	};
};

export const PROMPT_CATALOG: LaboratoryPromptCatalog = {
	laboratory: {
		intake: promptEntry(intakePrompt),
		targetClassification: {
			de: { highLevelWholeUnit: promptEntry(targetPrompt) },
		},
		grammaticalResolution: { de: grammaticalResolutionCatalog },
		readingResolution: { de: promptEntry(readingPrompt) },
		unitShadowClassification: promptEntry(unitShadowClassificationPrompt),
		knowledge: {
			morphologicalTree: {
				segmentation: promptEntry(morphologicalSegmentationPrompt),
				resolution: promptEntry(morphologicalResolutionPrompt),
			},
			lexicalBreakdown: {
				segmentation: promptEntry(lexicalSegmentationPrompt),
				resolution: promptEntry(lexicalResolutionPrompt),
			},
		},
	},
};
