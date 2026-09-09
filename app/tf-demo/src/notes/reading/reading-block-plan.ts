import type { NoteBlockKind } from "../note-block-kind";
import { reconcileNoteBlockLayout } from "../note-block-layout";
import { registeredNoteBlockMap } from "../note-block-renderer-registry-runtime";
import type { TargetLanguage } from "../target-language";
import type { ReadingNoteBlockRenderer } from "./reading-note-render-context";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";

export type ReadingBlockKind = Exclude<NoteBlockKind, "Routes">;

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
	const registry = registeredNoteBlockMap(
		route.language,
		"Reading",
		route.family,
		route.kind,
	);
	if (!registry) {
		throw new Error(
			`Unsupported Reading route: ${route.language}/${route.family}/${route.kind}.`,
		);
	}
	const available = Object.keys(registry) as ReadingBlockKind[];
	const reconciled = reconcileNoteBlockLayout(layout, available);
	const hidden = new Set(reconciled.hidden);

	return reconciled.order.flatMap((blockKind) => {
		if (hidden.has(blockKind)) return [];
		const typedBlockKind = blockKind as ReadingBlockKind;
		const renderer = registry[typedBlockKind];
		if (!renderer) return [];
		return [
			{
				blockKind: typedBlockKind,
				renderer: renderer as ReadingNoteBlockRenderer<L, F, K>,
			},
		];
	});
}
