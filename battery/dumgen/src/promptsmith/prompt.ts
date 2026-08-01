import { createDeGrammaticalResolutionPrompt } from "./laboratory/de-grammatical-resolution";
import { createDeReadingResolutionPrompt } from "./laboratory/de-reading-resolution";
import {
	GERMAN_HIGH_LEVEL_ROUTES,
	type GermanHighLevelFamily,
	type GermanHighLevelKind,
} from "./laboratory/de-routes";
import { deSegmentationPrompt } from "./laboratory/de-segmentation";
import { deHighLevelWholeUnitTargetPrompt } from "./laboratory/de-target-classification";
import { intakePrompt } from "./laboratory/intake";
import type { Prompt, PromptCatalogEntry } from "./prompt-definition";

export type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "./prompt-definition";

type GrammaticalPrompt = ReturnType<typeof createDeGrammaticalResolutionPrompt>;
type ReadingPrompt = ReturnType<typeof createDeReadingResolutionPrompt>;

type GermanRoutePromptCatalog<Definition extends Prompt> = {
	readonly [Family in GermanHighLevelFamily]: {
		readonly [Kind in GermanHighLevelKind<Family>]: PromptCatalogEntry<Definition>;
	};
};

export type LaboratoryPromptCatalog = {
	readonly laboratory: {
		readonly intake: PromptCatalogEntry<typeof intakePrompt>;
		readonly segmentation: {
			readonly de: PromptCatalogEntry<typeof deSegmentationPrompt>;
		};
		readonly targetClassification: {
			readonly de: {
				readonly highLevelWholeUnit: PromptCatalogEntry<
					typeof deHighLevelWholeUnitTargetPrompt
				>;
			};
		};
		readonly grammaticalResolution: {
			readonly de: GermanRoutePromptCatalog<GrammaticalPrompt>;
		};
		readonly readingResolution: {
			readonly de: GermanRoutePromptCatalog<ReadingPrompt>;
		};
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

const grammaticalResolutionCatalog = buildGermanRouteCatalog(
	createDeGrammaticalResolutionPrompt,
);
const readingResolutionCatalog = buildGermanRouteCatalog(
	createDeReadingResolutionPrompt,
);

// Generated manifest. Do not edit by hand.
export const PROMPT_CATALOG: LaboratoryPromptCatalog = {
	laboratory: {
		intake: promptEntry(intakePrompt),
		segmentation: { de: promptEntry(deSegmentationPrompt) },
		targetClassification: {
			de: {
				highLevelWholeUnit: promptEntry(
					deHighLevelWholeUnitTargetPrompt,
				),
			},
		},
		grammaticalResolution: { de: grammaticalResolutionCatalog },
		readingResolution: { de: readingResolutionCatalog },
	},
};
