import { reconcileSerializedBlockLayout } from "../../../../shared/note-block-layout";
import type { NoteBlockKind } from "../blocks/kind";
import { orderNoteBlockKinds } from "./block-ordering/order-blocks";

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
	const reconciled = reconcileSerializedBlockLayout(
		{ order: layout.order, hidden: [...layout.hidden] },
		available,
		orderNoteBlockKinds(new Set(available)),
	);
	return {
		order: reconciled.order,
		hidden: new Set(reconciled.hidden),
	};
}
