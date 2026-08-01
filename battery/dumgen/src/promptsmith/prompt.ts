import type { z } from "zod";

import type {
	AnalysisTarget,
	GrammaticalResolution,
	ReadingResolution,
	Unresolved,
} from "../types";
import { createDeGrammaticalResolutionPrompt } from "./laboratory/de-grammatical-resolution";
import {
	buildDeNounCitationSurfaceCodec,
	buildDeNounInflectionSurfaceCodec,
	deNounLemmaCodec,
} from "./laboratory/de-noun-codecs";
import { createDeReadingResolutionPrompt } from "./laboratory/de-reading-resolution";
import {
	GERMAN_HIGH_LEVEL_ROUTES,
	type GermanHighLevelFamily,
	type GermanHighLevelKind,
	isGermanHighLevelRoute,
} from "./laboratory/de-routes";
import { systemPrompt as grammarNounSystemPrompt } from "./laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/noun";
import { systemPrompt as intakeSystemPrompt } from "./laboratory/generated-system-prompt/intake";
import { systemPrompt as readingNounSystemPrompt } from "./laboratory/generated-system-prompt/reading-resolution/de/lexeme/noun";
import { systemPrompt as segmentationSystemPrompt } from "./laboratory/generated-system-prompt/segmentation/de";
import { systemPrompt as targetSystemPrompt } from "./laboratory/generated-system-prompt/target-classification/de/high-level-whole-unit";
import { inputSchema as grammarNounInputSchema } from "./laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/input-schema";
import { outputSchema as grammarNounOutputSchema } from "./laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/output-schema";
import { inputSchema as intakeInputSchema } from "./laboratory/prompt-part/intake/input-schema";
import { outputSchema as intakeOutputSchema } from "./laboratory/prompt-part/intake/output-schema";
import { inputSchema as readingNounModelInputSchema } from "./laboratory/prompt-part/reading-resolution/de/lexeme/noun/input-schema";
import { outputSchema as readingNounOutputSchema } from "./laboratory/prompt-part/reading-resolution/de/lexeme/noun/output-schema";
import { inputSchema as segmentationInputSchema } from "./laboratory/prompt-part/segmentation/de/input-schema";
import { outputSchema as segmentationOutputSchema } from "./laboratory/prompt-part/segmentation/de/output-schema";
import { inputSchema as targetInputSchema } from "./laboratory/prompt-part/target-classification/de/high-level-whole-unit/input-schema";
import { outputSchema as targetOutputSchema } from "./laboratory/prompt-part/target-classification/de/high-level-whole-unit/output-schema";
import type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "./prompt-definition";

export type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "./prompt-definition";

const intakePrompt = {
	systemPrompt: intakeSystemPrompt,
	inputSchema: intakeInputSchema,
	outputSchema: intakeOutputSchema,
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 64 },
} satisfies Prompt<typeof intakeInputSchema, typeof intakeOutputSchema>;

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
			if (generated.decision === "Unresolved") return;
			if (!isGermanHighLevelRoute(generated.family, generated.kind)) {
				throw new Error(
					"Target must select a reachable German high-level route.",
				);
			}
			const indices = generated.memberSegmentIndices;
			if (!indices.includes(input.clickedSegmentIndex)) {
				throw new Error(
					"Target members must include the clicked Segment.",
				);
			}
			for (let position = 0; position < indices.length; position += 1) {
				const index = indices[position];
				if (
					index === undefined ||
					input.segments[index]?.kind !== "ResolvableText"
				) {
					throw new Error(
						"Target members must reference ResolvableText.",
					);
				}
				if (position > 0 && (indices[position - 1] ?? index) >= index) {
					throw new Error(
						"Target members must be ordered and unique.",
					);
				}
			}
		},
	},
	projectOutput(_input, generated): AnalysisTarget | Unresolved {
		if (generated.decision === "Unresolved") return generated;
		return {
			memberSegmentIndices: generated.memberSegmentIndices,
			family: generated.family,
			kind: generated.kind,
		} as AnalysisTarget;
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof targetInputSchema,
	typeof targetOutputSchema,
	AnalysisTarget | Unresolved
>;

const grammarNounPrompt = {
	systemPrompt: grammarNounSystemPrompt,
	inputSchema: grammarNounInputSchema,
	outputSchema: grammarNounOutputSchema,
	outputPostcondition: {
		assert(input, generated) {
			if (generated.decision === "Unresolved") return;
			const markerCount =
				input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
			const closingCount =
				input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
			if (
				markerCount < 1 ||
				markerCount !== closingCount ||
				generated.memberOrthographies.length !== markerCount
			) {
				throw new Error(
					"Member orthographies must align one-to-one with TARGET markers.",
				);
			}
		},
	},
	projectOutput(_input, generated): GrammaticalResolution {
		if (generated.decision === "Unresolved") return generated;
		const lemma = deNounLemmaCodec.decode(generated.lemma);
		const surfaceCodec =
			generated.surface.surfaceKind === "Inflection"
				? buildDeNounInflectionSurfaceCodec(lemma)
				: buildDeNounCitationSurfaceCodec(lemma);
		const linkedSurface = surfaceCodec.decode(generated.surface as never);
		const { lemma: _linkedLemma, ...surface } = linkedSurface;
		return {
			decision: "Resolved",
			memberOrthographies: generated.memberOrthographies,
			surface,
			lemma,
		} as GrammaticalResolution;
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
} satisfies Prompt<
	typeof grammarNounInputSchema,
	typeof grammarNounOutputSchema,
	GrammaticalResolution
>;

const readingNounInputSchema = readingNounModelInputSchema.extend({
	lemma: deNounLemmaCodec.out,
});
const readingNounPrompt = {
	systemPrompt: readingNounSystemPrompt,
	inputSchema: readingNounInputSchema,
	modelInputSchema: readingNounModelInputSchema,
	outputSchema: readingNounOutputSchema,
	projectInput(input): z.output<typeof readingNounModelInputSchema> {
		return {
			markedContext: input.markedContext,
			lemma: deNounLemmaCodec.encode(input.lemma),
			existingEmojiDescriptions: input.existingEmojiDescriptions,
		};
	},
	generationParams: { model: "gpt-5-nano", maxOutputTokens: 192 },
} satisfies Prompt<
	typeof readingNounInputSchema,
	typeof readingNounOutputSchema,
	ReadingResolution,
	typeof readingNounModelInputSchema
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
const legacyReadingCatalog = buildGermanRouteCatalog(
	createDeReadingResolutionPrompt,
);
const grammaticalResolutionCatalog = {
	...legacyGrammaticalCatalog,
	Lexeme: {
		...legacyGrammaticalCatalog.Lexeme,
		NOUN: promptEntry(grammarNounPrompt),
	},
};
const readingResolutionCatalog = {
	...legacyReadingCatalog,
	Lexeme: {
		...legacyReadingCatalog.Lexeme,
		NOUN: promptEntry(readingNounPrompt),
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
		readingResolution: { de: readingResolutionCatalog },
	},
} as const satisfies PromptTree;

export type LaboratoryPromptCatalog = typeof PROMPT_CATALOG;
