import { z } from "zod";

import { DUMGEN_GENERATION_MODEL } from "../ai-sdk/model-policy";
import { systemPrompt as intakeSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/intake";
import { systemPrompt as readingSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/reading-resolution/de";
import { systemPrompt as segmentationSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/segmentation/de";
import { systemPrompt as targetSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/target-classification/de/high-level-whole-unit";
import {
	inputSchema as intakeInputSchema,
	outputSchema as intakeOutputSchema,
} from "../promptsmith/laboratory/prompt-source/intake/schemas";
import {
	inputSchema as readingModelInputSchema,
	outputSchema as readingOutputSchema,
} from "../promptsmith/laboratory/prompt-source/reading-resolution/de/schemas";
import {
	inputSchema as segmentationInputSchema,
	outputSchema as segmentationOutputSchema,
} from "../promptsmith/laboratory/prompt-source/segmentation/de/schemas";
import {
	inputSchema as targetInputSchema,
	outputSchema as targetOutputSchema,
} from "../promptsmith/laboratory/prompt-source/target-classification/de/high-level-whole-unit/schemas";
import { isGermanHighLevelRoute } from "../schema/german-high-level-routes";
import type {
	AnalysisTarget,
	IntakeDecision,
	ReadingResolution,
	Unresolved,
} from "../types";
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
		assert(_input, generated) {
			const valid =
				(generated.decision === "Accepted" &&
					generated.language === "de") ||
				(generated.decision === "UnsupportedLanguage" &&
					generated.language !== null &&
					generated.language !== "de") ||
				(generated.decision === "Unintelligible" &&
					generated.language === null);
			if (!valid) {
				throw new Error(
					"Intake decision and resolved language are inconsistent.",
				);
			}
		},
	},
	projectOutput(_input, generated): IntakeDecision {
		return generated as IntakeDecision;
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 64 },
} satisfies Prompt<
	typeof intakeInputSchema,
	typeof intakeOutputSchema,
	IntakeDecision
>;

const segmentationPrompt = {
	systemPrompt: segmentationSystemPrompt,
	inputSchema: segmentationInputSchema,
	outputSchema: segmentationOutputSchema,
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 2048 },
} satisfies Prompt<
	typeof segmentationInputSchema,
	typeof segmentationOutputSchema
>;

const targetPrompt = {
	systemPrompt: targetSystemPrompt,
	inputSchema: targetInputSchema,
	outputSchema: targetOutputSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (generated.decision === "Unresolved") {
				if (generated.target !== null) {
					throw new Error(
						"Unresolved Target must not include a target.",
					);
				}
				return;
			}
			if (generated.target === null) {
				throw new Error("Resolved Target requires a target.");
			}
			if (
				!isGermanHighLevelRoute(
					generated.target.family,
					generated.target.kind,
				)
			) {
				throw new Error(
					"Target must select a reachable German high-level route.",
				);
			}
			const additionalIndices =
				generated.target.additionalMemberSegmentIndices;
			if (additionalIndices.includes(input.clickedSegmentIndex)) {
				throw new Error(
					"Additional target members must not repeat the clicked Segment.",
				);
			}
			if (new Set(additionalIndices).size !== additionalIndices.length) {
				throw new Error("Additional target members must be unique.");
			}
			const indices = targetMemberSegmentIndices(
				input.clickedSegmentIndex,
				additionalIndices,
			);
			for (const index of indices) {
				if (input.segments[index]?.kind !== "ResolvableText") {
					throw new Error(
						"Target members must reference ResolvableText.",
					);
				}
			}
		},
	},
	projectOutput(input, generated): AnalysisTarget | Unresolved {
		if (generated.decision === "Unresolved") {
			return { decision: "Unresolved" };
		}
		if (generated.target === null) {
			throw new Error("Resolved Target requires a target.");
		}
		return {
			family: generated.target.family,
			kind: generated.target.kind,
			memberSegmentIndices: targetMemberSegmentIndices(
				input.clickedSegmentIndex,
				generated.target.additionalMemberSegmentIndices,
			),
		} as AnalysisTarget;
	},
	generationParams: { model: DUMGEN_GENERATION_MODEL, maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof targetInputSchema,
	typeof targetOutputSchema,
	AnalysisTarget | Unresolved
>;

function targetMemberSegmentIndices(
	clickedSegmentIndex: number,
	additionalMemberSegmentIndices: readonly number[],
): number[] {
	return [clickedSegmentIndex, ...additionalMemberSegmentIndices].toSorted(
		(left, right) => left - right,
	);
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
		readonly segmentation: {
			readonly de: PromptCatalogEntry<typeof segmentationPrompt>;
		};
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
		segmentation: { de: promptEntry(segmentationPrompt) },
		targetClassification: {
			de: { highLevelWholeUnit: promptEntry(targetPrompt) },
		},
		grammaticalResolution: { de: grammaticalResolutionCatalog },
		readingResolution: { de: promptEntry(readingPrompt) },
	},
};
