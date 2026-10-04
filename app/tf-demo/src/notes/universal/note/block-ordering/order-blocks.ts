import {
	type NoteLayoutBlockKind,
	noteLayoutBlockKindSchema,
} from "../../blocks/kind";
import { WEIGHT_FOR_NOTE_LAYOUT_BLOCK_KIND } from "./default-order";

export function orderNoteLayoutBlockKinds(
	blockKinds: ReadonlySet<NoteLayoutBlockKind>,
	weightFor: Readonly<
		Record<NoteLayoutBlockKind, number>
	> = WEIGHT_FOR_NOTE_LAYOUT_BLOCK_KIND,
): readonly NoteLayoutBlockKind[] {
	assertStrictNoteLayoutBlockKindWeights(weightFor);
	return [...blockKinds].sort(
		(left, right) => weightFor[left] - weightFor[right],
	);
}

function assertStrictNoteLayoutBlockKindWeights(
	weightFor: Readonly<Record<NoteLayoutBlockKind, number>>,
): void {
	const kindForWeight = new Map<number, NoteLayoutBlockKind>();
	for (const kind of noteLayoutBlockKindSchema.options) {
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
