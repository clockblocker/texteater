import { type NoteBlockKind, noteBlockKindSchema } from "../../blocks/kind";
import { WEIGHT_FOR_NOTE_BLOCK_KIND } from "./default-order";

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
