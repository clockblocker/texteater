import {
	type NoteBodyBlockKind,
	noteBodyBlockKindSchema,
} from "../../blocks/kind";
import { WEIGHT_FOR_NOTE_BODY_BLOCK_KIND } from "./default-order";

export function orderNoteBodyBlockKinds(
	blockKinds: ReadonlySet<NoteBodyBlockKind>,
	weightFor: Readonly<
		Record<NoteBodyBlockKind, number>
	> = WEIGHT_FOR_NOTE_BODY_BLOCK_KIND,
): readonly NoteBodyBlockKind[] {
	assertStrictNoteBodyBlockKindWeights(weightFor);
	return [...blockKinds].sort(
		(left, right) => weightFor[left] - weightFor[right],
	);
}

function assertStrictNoteBodyBlockKindWeights(
	weightFor: Readonly<Record<NoteBodyBlockKind, number>>,
): void {
	const kindForWeight = new Map<number, NoteBodyBlockKind>();
	for (const kind of noteBodyBlockKindSchema.options) {
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
