import type { z } from "zod";
import { systemPrompt as grammarNounSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/noun";
import { systemPrompt as intakeSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/intake";
import { systemPrompt as readingSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/reading-resolution/de";
import { systemPrompt as segmentationSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/segmentation/de";
import { systemPrompt as targetSystemPrompt } from "../promptsmith/laboratory/generated-system-prompt/target-classification/de/high-level-whole-unit";
import { inputSchema as grammarNounInputSchema } from "../promptsmith/laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/input-schema";
import { outputSchema as grammarNounOutputSchema } from "../promptsmith/laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/output-schema";
import { inputSchema as intakeInputSchema } from "../promptsmith/laboratory/prompt-part/intake/input-schema";
import { outputSchema as intakeOutputSchema } from "../promptsmith/laboratory/prompt-part/intake/output-schema";
import { inputSchema as readingModelInputSchema } from "../promptsmith/laboratory/prompt-part/reading-resolution/de/input-schema";
import { outputSchema as readingOutputSchema } from "../promptsmith/laboratory/prompt-part/reading-resolution/de/output-schema";
import { inputSchema as segmentationInputSchema } from "../promptsmith/laboratory/prompt-part/segmentation/de/input-schema";
import { outputSchema as segmentationOutputSchema } from "../promptsmith/laboratory/prompt-part/segmentation/de/output-schema";
import { inputSchema as targetInputSchema } from "../promptsmith/laboratory/prompt-part/target-classification/de/high-level-whole-unit/input-schema";
import { outputSchema as targetOutputSchema } from "../promptsmith/laboratory/prompt-part/target-classification/de/high-level-whole-unit/output-schema";
import { deLemmaSchema } from "../schema/de-lemma-schema";
import {
	buildDeNounCitationSurfaceCodec,
	buildDeNounInflectionSurfaceCodec,
	deNounLemmaCodec,
} from "../schema/de-noun-codecs";
import {
	GERMAN_HIGH_LEVEL_ROUTES,
	type GermanHighLevelFamily,
	type GermanHighLevelKind,
	isGermanHighLevelRoute,
} from "../schema/german-high-level-routes";
import type {
	AnalysisTarget,
	GrammaticalResolution,
	IntakeDecision,
	ReadingResolution,
	Unresolved,
} from "../types";
import { createDeGrammaticalResolutionPrompt } from "./laboratory/create-de-grammatical-resolution-prompt";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "./prompt-definition";

function omitLinkedLemma<LinkedSurface extends { readonly lemma: unknown }>(
	linkedSurface: LinkedSurface,
): Omit<LinkedSurface, "lemma"> {
	const { lemma: _linkedLemma, ...surface } = linkedSurface;
	return surface;
}

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
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 64 },
} satisfies Prompt<
	typeof intakeInputSchema,
	typeof intakeOutputSchema,
	IntakeDecision
>;

const segmentationPrompt = {
	systemPrompt: segmentationSystemPrompt,
	inputSchema: segmentationInputSchema,
	outputSchema: segmentationOutputSchema,
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 2048 },
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
			const indices = targetMemberSegmentIndices(
				input.clickedSegmentIndex,
				generated.target.additionalMemberSegmentIndices,
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
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof targetInputSchema,
	typeof targetOutputSchema,
	AnalysisTarget | Unresolved
>;

function targetMemberSegmentIndices(
	clickedSegmentIndex: number,
	additionalMemberSegmentIndices: readonly number[],
): number[] {
	return [
		...new Set([clickedSegmentIndex, ...additionalMemberSegmentIndices]),
	].toSorted((left, right) => left - right);
}

const grammarNounPrompt = {
	systemPrompt: grammarNounSystemPrompt,
	inputSchema: grammarNounInputSchema,
	outputSchema: grammarNounOutputSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (generated.decision === "Unresolved") {
				if (generated.resolution !== null) {
					throw new Error(
						"Unresolved Grammatical Resolution must not include a resolution.",
					);
				}
				return;
			}
			if (generated.resolution === null) {
				throw new Error(
					"Resolved Grammatical Resolution requires a resolution.",
				);
			}
			const markerCount =
				input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
			const closingCount =
				input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
			if (
				markerCount < 1 ||
				markerCount !== closingCount ||
				generated.resolution.memberOrthographies.length !== markerCount
			) {
				throw new Error(
					"Member orthographies must align one-to-one with TARGET markers.",
				);
			}
		},
	},
	projectOutput(_input, generated): GrammaticalResolution {
		if (generated.decision === "Unresolved") {
			return { decision: "Unresolved" };
		}
		if (generated.resolution === null) {
			throw new Error(
				"Resolved Grammatical Resolution requires a resolution.",
			);
		}
		const resolution = generated.resolution;
		const lemma = deNounLemmaCodec.decode(resolution.lemma);
		const surface =
			resolution.surface.surfaceKind === "Inflection"
				? omitLinkedLemma(
						buildDeNounInflectionSurfaceCodec(lemma).decode(
							resolution.surface,
						),
					)
				: omitLinkedLemma(
						buildDeNounCitationSurfaceCodec(lemma).decode(
							resolution.surface,
						),
					);
		return {
			decision: "Resolved",
			memberOrthographies: resolution.memberOrthographies,
			surface,
			lemma,
		};
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof grammarNounInputSchema,
	typeof grammarNounOutputSchema,
	GrammaticalResolution
>;

const readingInputSchema = readingModelInputSchema.extend({
	lemma: deLemmaSchema,
});
const readingPrompt = {
	systemPrompt: readingSystemPrompt,
	inputSchema: readingInputSchema,
	modelInputSchema: readingModelInputSchema,
	outputSchema: readingOutputSchema,
	projectInput(input): z.output<typeof readingModelInputSchema> {
		return {
			markedContext: input.markedContext,
			lemma: input.lemma.canonicalForm,
			existingEmojiDescriptions: input.existingEmojiDescriptions,
		};
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 192 },
} satisfies Prompt<
	typeof readingInputSchema,
	typeof readingOutputSchema,
	ReadingResolution,
	typeof readingModelInputSchema
>;

type GermanRoutePromptCatalog<Definition extends Prompt> = {
	readonly [Family in GermanHighLevelFamily]: {
		readonly [Kind in GermanHighLevelKind<Family>]: PromptCatalogEntry<Definition>;
	};
};

function promptEntry<Definition extends Prompt>(
	prompt: Definition,
): PromptCatalogEntry<Definition> {
	return { meta: { kind: "prompt" }, prompt };
}

function buildGermanRouteCatalog<Definition extends Prompt>(
	createPrompt: (
		family: GermanHighLevelFamily,
		kind: GermanHighLevelKind<GermanHighLevelFamily>,
	) => Definition,
): GermanRoutePromptCatalog<Definition> {
	const families = Object.entries(GERMAN_HIGH_LEVEL_ROUTES).map(
		([family, kinds]) => [
			family,
			Object.fromEntries(
				kinds.map((kind) => [
					kind,
					promptEntry(
						createPrompt(
							family as GermanHighLevelFamily,
							kind as GermanHighLevelKind<GermanHighLevelFamily>,
						),
					),
				]),
			),
		],
	);
	return Object.fromEntries(families) as GermanRoutePromptCatalog<Definition>;
}

const legacyGrammaticalCatalog = buildGermanRouteCatalog(
	createDeGrammaticalResolutionPrompt,
);
const grammaticalResolutionCatalog = {
	...legacyGrammaticalCatalog,
	Lexeme: {
		...legacyGrammaticalCatalog.Lexeme,
		NOUN: promptEntry(grammarNounPrompt),
	},
};

export const PROMPT_CATALOG = {
	laboratory: {
		intake: promptEntry(intakePrompt),
		segmentation: { de: promptEntry(segmentationPrompt) },
		targetClassification: {
			de: { highLevelWholeUnit: promptEntry(targetPrompt) },
		},
		grammaticalResolution: { de: grammaticalResolutionCatalog },
		readingResolution: { de: promptEntry(readingPrompt) },
	},
} as const satisfies PromptTree;

export type LaboratoryPromptCatalog = typeof PROMPT_CATALOG;
