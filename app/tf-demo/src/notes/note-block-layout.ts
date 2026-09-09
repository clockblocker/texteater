import type { NoteBlockKind } from "./note-block-kind";
import { orderNoteBlockKinds } from "./note-block-order";

export type NoteBlockLayoutFor<B extends NoteBlockKind = NoteBlockKind> = {
	/** Includes visible and hidden Blocks so re-enabling preserves position. */
	readonly order: readonly B[];
	readonly hidden: ReadonlySet<B>;
};

export type NoteBlockLayout = NoteBlockLayoutFor;

export function defaultNoteBlockLayout<B extends NoteBlockKind>(
	available: readonly B[],
): NoteBlockLayoutFor<B> {
	return {
		order: orderNoteBlockKinds(new Set(available)) as readonly B[],
		hidden: new Set(),
	};
}

/** Reconciles presentation preferences against registry-owned availability. */
export function reconcileNoteBlockLayout(
	layout: NoteBlockLayout,
	available: readonly NoteBlockKind[],
): NoteBlockLayout {
	const supported = new Set(available);
	const seen = new Set<NoteBlockKind>();
	const order: NoteBlockKind[] = [];
	for (const blockKind of layout.order) {
		if (!supported.has(blockKind) || seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	for (const blockKind of orderNoteBlockKinds(supported)) {
		if (seen.has(blockKind)) continue;
		seen.add(blockKind);
		order.push(blockKind);
	}
	return {
		order,
		hidden: new Set(
			[...layout.hidden].filter((blockKind) => supported.has(blockKind)),
		),
	};
}
