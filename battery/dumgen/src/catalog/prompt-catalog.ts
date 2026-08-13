import { z } from "zod";

import { DUMGEN_GENERATION_MODEL } from "../ai-sdk/model-policy";
import {
	assertIntakeBatch,
	freezeIntakeBatch,
	type IntakeBatch,
} from "../intake/contracts";
import { systemPrompt as intakeSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/intake";
import { systemPrompt as readingSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/reading-resolution/de";
import {
	inputSchema as intakeInputSchema,
	outputSchema as intakeOutputSchema,
} from "../promptsmith/laboratory/prompt-source/intake/schemas";
import {
	inputSchema as readingModelInputSchema,
	outputSchema as readingOutputSchema,
} from "../promptsmith/laboratory/prompt-source/reading-resolution/de/schemas";
import { systemPrompt as targetSystemPrompt } from "../promptsmith/production/generated-system-prompt/target-classification/de/high-level-whole-unit";
import {
	additionalIndicesAdapter,
	projectClassificationInput,
	inputSchema as targetInputSchema,
	modelInputSchema as targetModelInputSchema,
	outputSchema as targetOutputSchema,
} from "../promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit";
import type { AnalysisTarget, ReadingResolution, Unresolved } from "../types";
import { createDeGrammaticalResolutionPrompt } from "./laboratory/create-de-grammatical-resolution-prompt";
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

const grammarFallbackInputSchema = z.strictObject({
	markedContext: z.string().min(1),
});
const grammarFallbackOutputSchema = z.strictObject({
	decision: z.literal("Unresolved"),
	resolution: z.null(),
});

const punctuationFallbackPrompt = createDeGrammaticalResolutionPrompt({
	family: "Lexeme",
	kind: "PUNCT",
	systemPrompt: "Legacy disabled Lexeme/PUNCT route.",
	inputSchema: grammarFallbackInputSchema,
	outputSchema: grammarFallbackOutputSchema,
});
const grammaticalResolutionCatalog = {
	Lexeme: {
		...promptEntries(DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS.Lexeme),
		PUNCT: promptEntry(punctuationFallbackPrompt),
	},
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
	},
};
