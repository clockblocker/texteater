import type { ReactElement } from "react";
import { reconcileSerializedBlockLayout } from "../../../../shared/note-block-layout";
import {
	type NoteBlockKind,
	type NoteBodyBlockKind,
	noteBodyBlockKindSchema,
} from "../blocks/kind";
import { orderNoteBodyBlockKinds } from "./block-ordering/order-blocks";

/**
 * Presentation order and visibility of a Note's Body. The Heading Block is
 * pinned first, so a layout cannot name it.
 */
export type NoteBlockLayoutFor<
	B extends NoteBodyBlockKind = NoteBodyBlockKind,
> = {
	/** Includes visible and hidden Blocks so re-enabling preserves position. */
	readonly order: readonly B[];
	readonly hidden: ReadonlySet<B>;
};

export type NoteBlockLayout = NoteBlockLayoutFor;

/** The Body Blocks a route's registry renders. */
export function availableBodyBlockKinds(
	registry: Partial<
		Record<NoteBlockKind, (context: never) => ReactElement | null>
	>,
): readonly NoteBodyBlockKind[] {
	return noteBodyBlockKindSchema.options.filter((kind) => registry[kind]);
}

export function defaultNoteBlockLayout<B extends NoteBodyBlockKind>(
	available: readonly B[],
): NoteBlockLayoutFor<B> {
	return {
		order: orderNoteBodyBlockKinds(new Set(available)) as readonly B[],
		hidden: new Set(),
	};
}

/** Reconciles presentation preferences against registry-owned availability. */
export function reconcileNoteBlockLayout(
	layout: NoteBlockLayout,
	available: readonly NoteBodyBlockKind[],
): NoteBlockLayout {
	const reconciled = reconcileSerializedBlockLayout(
		{ order: layout.order, hidden: [...layout.hidden] },
		available,
		orderNoteBodyBlockKinds(new Set(available)),
	);
	return {
		order: reconciled.order,
		hidden: new Set(reconciled.hidden),
	};
}
