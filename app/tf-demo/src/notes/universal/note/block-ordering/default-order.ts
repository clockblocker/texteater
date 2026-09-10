import type { NoteBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_BLOCK_KIND = {
	Header: 0,
	SourceContexts: 1,
	Relations: 2,
	Translations: 3,
	Definition: 4,
	MorphologicalTree: 5,
	LexicalBreakdown: 6,
	Routes: 7,
} as const satisfies Record<NoteBlockKind, number>;
