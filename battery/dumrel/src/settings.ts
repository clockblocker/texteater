import { deepFreeze } from "./applicability/deep-freeze.js";
import type { KnowledgeSettings } from "./types.js";

/** Complete application-wide defaults, exposed without loading Dumrel schemas. */
export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = deepFreeze({
	transcription: true,
	definition: true,
	translations: { en: true },
	morphologicalTree: true,
	lexicalBreakdown: true,
	semanticRelations: {
		synonym: true,
		nearSynonym: true,
		antonym: true,
		hypernym: true,
		hyponym: true,
		meronym: true,
		holonym: true,
	},
});

export type { KnowledgeSettings } from "./types.js";
