import type { NoteBodyBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_BODY_BLOCK_KIND = {
	SourceContexts: 1,
	Valency: 2,
	Relations: 3,
	Translations: 4,
	Definition: 5,
	PersonalAnnotation: 6,
	MorphologicalTree: 7,
	Fusion: 8,
	Routes: 9,
} as const satisfies Record<NoteBodyBlockKind, number>;
