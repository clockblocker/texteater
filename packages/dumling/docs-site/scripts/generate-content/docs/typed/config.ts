import { attestedSelectionRenderers } from "./renderers/attested-selection/index";
import type { AttestedSelectionRenderer } from "./renderers/attested-selection/types";

export type TypedDocsGenerationConfig = {
	attestedSelectionRenderers: Record<string, AttestedSelectionRenderer>;
	defaultAttestedSelectionRenderer: string;
};

export const typedDocsGenerationConfig: TypedDocsGenerationConfig = {
	attestedSelectionRenderers,
	defaultAttestedSelectionRenderer: "asLinkedSentenceAndLemmaCsv",
};
