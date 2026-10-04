import type { NoteLayoutBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_LAYOUT_BLOCK_KIND = {
	Valency: 1,
	Relations: 2,
	Translations: 3,
	Definition: 4,
	PersonalAnnotation: 5,
	MorphologicalTree: 6,
	Fusion: 7,
	Routes: 8,
} as const satisfies Record<NoteLayoutBlockKind, number>;
