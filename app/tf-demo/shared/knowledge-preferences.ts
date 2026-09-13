import type * as Dumrel from "dumrel/types";
/** Complete app preferences; Dumrel accepts optional policy settings. */
export const DEFAULT_KNOWLEDGE_SETTINGS = {
	transcription: true,
	definition: true,
	translations: { en: true, ru: true },
	morphologicalTree: true,
	lexicalBreakdown: true,
	semanticRelations: {
		synonym: true,
		nearSynonym: true,
		antonym: true,
		nearAntonym: true,
		hypernym: true,
		holonym: true,
	},
} satisfies Dumrel.KnowledgeSettings;
type Booleans<T> = {
	[K in keyof T]: T[K] extends boolean ? boolean : Booleans<T[K]>;
};
export type KnowledgePreferences = Booleans<typeof DEFAULT_KNOWLEDGE_SETTINGS>;
export function relationPreference(
	relation: Dumrel.SemanticRelation,
): Dumrel.DirectSemanticRelation {
	return relation === "hyponym"
		? "hypernym"
		: relation === "meronym"
			? "holonym"
			: relation;
}
