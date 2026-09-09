import type { NoteBlockKind } from "../note-block-kind";
import { registeredNoteBlockMap } from "../note-block-renderer-registry-runtime";
import type { TargetLanguage } from "../target-language";
import type { ReadingNoteBlockRenderer } from "./reading-note-render-context";
import type {
	ReadingNoteRoute,
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";

type ReadingBlockKind = Exclude<NoteBlockKind, "Routes">;

export function availableBlocksFor(
	route: ReadingNoteRoute,
): readonly ReadingBlockKind[];
export function availableBlocksFor(route: {
	readonly language?: string;
	readonly targetLanguage?: string;
	readonly family: string;
	readonly kind: string;
}): readonly ReadingBlockKind[] | null;
export function availableBlocksFor(route: {
	readonly language?: string;
	readonly targetLanguage?: string;
	readonly family: string;
	readonly kind: string;
}): readonly ReadingBlockKind[] | null {
	const registry = registeredNoteBlockMap(
		route.language ?? route.targetLanguage ?? "",
		"Reading",
		route.family,
		route.kind,
	);
	return registry ? (Object.keys(registry) as ReadingBlockKind[]) : null;
}

export function rendererFor<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	route: ReadingNoteRouteKey<L, F, K>,
	blockKind: ReadingBlockKind,
): ReadingNoteBlockRenderer<L, F, K> {
	const renderer = registeredNoteBlockMap(
		route.language,
		"Reading",
		route.family,
		route.kind,
	)?.[blockKind];
	if (!renderer) {
		throw new Error(
			`Unsupported Reading Block for ${route.language}/${route.family}/${route.kind}: ${blockKind}.`,
		);
	}
	return renderer as ReadingNoteBlockRenderer<L, F, K>;
}
