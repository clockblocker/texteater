import type { NoteBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_BLOCK_KIND = {
	Header: 0,
	SourceContexts: 1,
	Relations: 2,
	Translations: 3,
	Definition: 4,
	PersonalAnnotation: 5,
	MorphologicalTree: 6,
	LexicalBreakdown: 7,
	Routes: 8,
} as const satisfies Record<NoteBlockKind, number>;
