import type * as Dumrel from "dumrel/types";
/** Complete app preferences; Dumrel accepts optional policy settings. */
export const DEFAULT_KNOWLEDGE_SETTINGS = {
	transcription: true,
	definition: true,
	translations: { en: true, ru: true },
	morphologicalTree: true,
	semanticRelations: {
		synonym: true,
		nearSynonym: true,
		antonym: true,
		nearAntonym: true,
		hypernym: true,
		holonym: true,
		endonym: true,
	},
} satisfies Dumrel.KnowledgeSettings;
type Booleans<T> = {
	[K in keyof T]: T[K] extends boolean ? boolean : Booleans<T[K]>;
};
export type KnowledgePreferences = Booleans<typeof DEFAULT_KNOWLEDGE_SETTINGS>;
/** The stored relation whose preference governs a projected inverse. */
export function relationPreference(
	relation: Dumrel.SemanticRelation,
): Dumrel.DirectSemanticRelation {
	switch (relation) {
		case "hyponym":
			return "hypernym";
		case "meronym":
			return "holonym";
		case "exonym":
			return "endonym";
		default:
			return relation;
	}
}
