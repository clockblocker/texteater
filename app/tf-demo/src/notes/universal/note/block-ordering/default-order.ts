import type { NoteBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_BLOCK_KIND = {
	Header: 0,
	SourceContexts: 1,
	Valency: 2,
	Relations: 3,
	Translations: 4,
	Definition: 5,
	PersonalAnnotation: 6,
	MorphologicalTree: 7,
	LexicalBreakdown: 8,
	Routes: 9,
} as const satisfies Record<NoteBlockKind, number>;
