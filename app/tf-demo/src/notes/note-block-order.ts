import { type NoteBlockKind, noteBlockKindSchema } from "./note-block-kind";

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

export function orderNoteBlockKinds(
	blockKinds: ReadonlySet<NoteBlockKind>,
	weightFor: Readonly<
		Record<NoteBlockKind, number>
	> = WEIGHT_FOR_NOTE_BLOCK_KIND,
): readonly NoteBlockKind[] {
	assertStrictNoteBlockKindWeights(weightFor);
	return [...blockKinds].sort(
		(left, right) => weightFor[left] - weightFor[right],
	);
}

function assertStrictNoteBlockKindWeights(
	weightFor: Readonly<Record<NoteBlockKind, number>>,
): void {
	const kindForWeight = new Map<number, NoteBlockKind>();
	for (const kind of noteBlockKindSchema.options) {
		const weight = weightFor[kind];
		if (!Number.isFinite(weight)) {
			throw new Error(
				`The Note Block weight for ${kind} must be finite.`,
			);
		}
		const tiedKind = kindForWeight.get(weight);
		if (tiedKind) {
			throw new Error(
				`Note Block weights must be unique; ${tiedKind} and ${kind} both use ${weight}.`,
			);
		}
		kindForWeight.set(weight, kind);
	}
}
