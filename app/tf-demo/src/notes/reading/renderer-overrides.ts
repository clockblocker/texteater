import type { NoteBlockKindFor } from "../note-block-kind";
import type { TargetLanguage } from "../target-language";
import type { ReadingNoteBlockRenderer } from "./reading-note-render-context";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";

export type ReadingNoteRendererOverrideRegistry<L extends TargetLanguage> =
	Partial<{
		[Family in UnitReadingFamilyFor<L>]: Partial<{
			[Kind in UnitReadingKindFor<L, Family>]: Partial<
				Record<
					NoteBlockKindFor<"UnitReadingNote">,
					ReadingNoteBlockRenderer<L, Family, Kind>
				>
			>;
		}>;
	}>;

export type ReadingNoteRouteRendererOverrides<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
> = Partial<
	Record<
		NoteBlockKindFor<"UnitReadingNote">,
		ReadingNoteBlockRenderer<L, F, K>
	>
>;

export function readingNoteRendererOverrideFor<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	registry: ReadingNoteRendererOverrideRegistry<L>,
	route: ReadingNoteRouteKey<L, F, K>,
	blockKind: NoteBlockKindFor<"UnitReadingNote">,
): ReadingNoteBlockRenderer<L, F, K> | undefined {
	const familyRegistry = registry[route.family] as
		| Partial<Record<K, ReadingNoteRouteRendererOverrides<L, F, K>>>
		| undefined;
	return familyRegistry?.[route.kind]?.[blockKind];
}

export function selectReadingNoteRenderer<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	defaultRenderer: ReadingNoteBlockRenderer<L, F, K>,
	override: ReadingNoteBlockRenderer<L, F, K> | undefined,
): ReadingNoteBlockRenderer<L, F, K> {
	return override ?? defaultRenderer;
}
