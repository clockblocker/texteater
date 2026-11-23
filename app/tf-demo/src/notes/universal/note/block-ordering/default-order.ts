import type { NoteLayoutBlockKind } from "../../blocks/kind";

export const WEIGHT_FOR_NOTE_LAYOUT_BLOCK_KIND = {
	Translations: 1,
	Definition: 2,
	Breakdown: 3,
	Valency: 4,
	Paradigm: 4.5,
	Relations: 5,
	PersonalAnnotation: 6,
	Fusion: 7,
	Routes: 8,
	Formations: 9,
} as const satisfies Record<NoteLayoutBlockKind, number>;
