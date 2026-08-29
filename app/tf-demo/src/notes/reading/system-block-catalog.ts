import {
	availableReadingBlocksForRoute,
	defaultReadingBlockLayoutForRoute,
	type ReadingBlockRoute,
} from "../../../shared/reading-block-layout";
import type { NoteBlockKindFor } from "../note-block-kind";
import type { TargetLanguage } from "../target-language";
import { DE_READING_NOTE_RENDERER_OVERRIDES } from "./de/de-renderer-overrides";
import { DEFAULT_READING_NOTE_RENDERER_FOR } from "./default-renderers";
import type { ReadingNoteBlockRenderer } from "./reading-note-render-context";
import type {
	ReadingNoteRoute,
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";
import type { ReadingNoteRendererOverrideRegistry } from "./renderer-overrides";
import { readingNoteRendererOverrideFor } from "./renderer-overrides";

type ReadingBlockKind = NoteBlockKindFor<"UnitReadingNote">;

export function availableBlocksFor(
	route: ReadingNoteRoute,
): readonly ReadingBlockKind[];
export function availableBlocksFor(
	route: ReadingBlockRoute,
): readonly ReadingBlockKind[] | null;
/** Returns the route's supported Blocks in their static catalog order. */
export function availableBlocksFor(
	route: ReadingBlockRoute,
): readonly ReadingBlockKind[] | null {
	const available = availableReadingBlocksForRoute(route);
	if (!available) return null;

	// The default layout is catalog-authored and covers every available Block.
	// Returning it here keeps ordering and applicability behind the same seam.
	return defaultReadingBlockLayoutForRoute(route)?.order ?? available;
}

/** Selects catalog-owned executable behavior for one supported route Block. */
export function rendererFor<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	route: ReadingNoteRouteKey<L, F, K>,
	blockKind: ReadingBlockKind,
): ReadingNoteBlockRenderer<L, F, K> {
	const available = availableBlocksFor(route as ReadingNoteRoute);
	if (!available.includes(blockKind)) {
		throw new Error(
			`Unsupported Reading Block for ${route.targetLanguage}/${route.family}/${route.kind}: ${blockKind}.`,
		);
	}

	const defaultRenderer = DEFAULT_READING_NOTE_RENDERER_FOR[blockKind];
	// The configured TargetLanguage union currently contains only German. The
	// catalog switch remains internal so future languages add one branch here.
	const overrides =
		route.targetLanguage === "de"
			? (DE_READING_NOTE_RENDERER_OVERRIDES as unknown as ReadingNoteRendererOverrideRegistry<L>)
			: {};
	const override = readingNoteRendererOverrideFor<L, F, K>(
		overrides,
		route,
		blockKind,
	);
	return override ?? defaultRenderer;
}
