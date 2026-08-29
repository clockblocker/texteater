import {
	reconcileReadingBlockLayout,
	type ReadingBlockKind as SharedReadingBlockKind,
} from "../../../shared/reading-block-layout";
import type { NoteBlockKindFor } from "../note-block-kind";
import type { TargetLanguage } from "../target-language";
import type { ReadingNoteBlockRenderer } from "./reading-note-render-context";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";
import { availableBlocksFor, rendererFor } from "./system-block-catalog";

export type ReadingBlockKind = NoteBlockKindFor<"UnitReadingNote">;

export type ReadingBlockLayout = {
	/** Includes visible and hidden Blocks so re-enabling preserves position. */
	readonly order: readonly ReadingBlockKind[];
	readonly hidden: ReadonlySet<ReadingBlockKind>;
};

export type ReadingBlockPlan<
	L extends TargetLanguage = TargetLanguage,
	F extends UnitReadingFamilyFor<L> = UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F> = UnitReadingKindFor<L, F>,
> = readonly {
	readonly blockKind: ReadingBlockKind;
	readonly renderer: ReadingNoteBlockRenderer<L, F, K>;
}[];

/** Reconciles persisted layout state with trusted catalog behavior. */
export function resolveReadingBlockPlan<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	route: ReadingNoteRouteKey<L, F, K>,
	layout: ReadingBlockLayout,
): ReadingBlockPlan<L, F, K> {
	const available = availableBlocksFor(route);
	const reconciled = reconcileReadingBlockLayout(
		{
			order: layout.order as readonly SharedReadingBlockKind[],
			hidden: [...layout.hidden] as readonly SharedReadingBlockKind[],
		},
		available as readonly SharedReadingBlockKind[],
	);
	const hidden = new Set(reconciled.hidden);

	return reconciled.order.flatMap((blockKind) => {
		if (hidden.has(blockKind)) return [];
		const typedBlockKind = blockKind as ReadingBlockKind;
		return [
			{
				blockKind: typedBlockKind,
				renderer: rendererFor(route, typedBlockKind),
			},
		];
	});
}
