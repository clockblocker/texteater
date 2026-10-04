import type { ReactElement } from "react";
import { reconcileSerializedBlockLayout } from "../../../../shared/note-block-layout";
import {
	type NoteBlockKind,
	type NoteLayoutBlockKind,
	noteLayoutBlockKindSchema,
} from "../blocks/kind";
import { orderNoteLayoutBlockKinds } from "./block-ordering/order-blocks";

/**
 * Presentation order and visibility of a Note's laid-out Blocks. The Anchor
 * Blocks, Heading and Source Contexts, are pinned, so a layout cannot name
 * them.
 */
export type NoteBlockLayoutFor<
	B extends NoteLayoutBlockKind = NoteLayoutBlockKind,
> = {
	/** Includes visible and hidden Blocks so re-enabling preserves position. */
	readonly order: readonly B[];
	readonly hidden: ReadonlySet<B>;
};

export type NoteBlockLayout = NoteBlockLayoutFor;

/** The laid-out Blocks a route's registry renders. */
export function availableLayoutBlockKinds(
	registry: Partial<
		Record<NoteBlockKind, (context: never) => ReactElement | null>
	>,
): readonly NoteLayoutBlockKind[] {
	return noteLayoutBlockKindSchema.options.filter((kind) => registry[kind]);
}

export function defaultNoteBlockLayout<B extends NoteLayoutBlockKind>(
	available: readonly B[],
): NoteBlockLayoutFor<B> {
	return {
		order: orderNoteLayoutBlockKinds(new Set(available)) as readonly B[],
		hidden: new Set(),
	};
}

/** Reconciles presentation preferences against registry-owned availability. */
export function reconcileNoteBlockLayout(
	layout: NoteBlockLayout,
	available: readonly NoteLayoutBlockKind[],
): NoteBlockLayout {
	const reconciled = reconcileSerializedBlockLayout(
		{ order: layout.order, hidden: [...layout.hidden] },
		available,
		orderNoteLayoutBlockKinds(new Set(available)),
	);
	return {
		order: reconciled.order,
		hidden: new Set(reconciled.hidden),
	};
}
