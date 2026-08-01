import { deLemmaPrompt } from "./laboratory/de-lemma";
import { deReadingPrompt } from "./laboratory/de-reading";
import { deSegmentationPrompt } from "./laboratory/de-segmentation";
import { deSelectionPrompt } from "./laboratory/de-selection";
import { deSurfacePrompt } from "./laboratory/de-surface";
import type { PromptCatalogEntry } from "./prompt-definition";

export type {
	Prompt,
	PromptCatalogEntry,
	PromptTree,
} from "./prompt-definition";

export type LaboratoryPromptCatalog = {
	readonly laboratory: {
		readonly classification: {
			readonly de: {
				readonly selection: PromptCatalogEntry<
					typeof deSelectionPrompt
				>;
				readonly surface: PromptCatalogEntry<typeof deSurfacePrompt>;
				readonly lemma: PromptCatalogEntry<typeof deLemmaPrompt>;
				readonly reading: PromptCatalogEntry<typeof deReadingPrompt>;
			};
		};
		readonly segmentation: {
			readonly de: {
				readonly segment: PromptCatalogEntry<
					typeof deSegmentationPrompt
				>;
			};
		};
	};
};

// Generated manifest. Do not edit by hand.
export const PROMPT_CATALOG: LaboratoryPromptCatalog = {
	laboratory: {
		classification: {
			de: {
				selection: {
					meta: { kind: "prompt" },
					prompt: deSelectionPrompt,
				},
				surface: {
					meta: { kind: "prompt" },
					prompt: deSurfacePrompt,
				},
				lemma: {
					meta: { kind: "prompt" },
					prompt: deLemmaPrompt,
				},
				reading: {
					meta: { kind: "prompt" },
					prompt: deReadingPrompt,
				},
			},
		},
		segmentation: {
			de: {
				segment: {
					meta: { kind: "prompt" },
					prompt: deSegmentationPrompt,
				},
			},
		},
	},
};
