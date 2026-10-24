import type { NoteLayoutBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_LAYOUT_BLOCK_KIND = {
	Valency: 1,
	Paradigm: 1.5,
	Breakdown: 2,
	Relations: 3,
	Translations: 4,
	Definition: 5,
	PersonalAnnotation: 6,
	Fusion: 7,
	Routes: 8,
	Formations: 9,
} as const satisfies Record<NoteLayoutBlockKind, number>;
