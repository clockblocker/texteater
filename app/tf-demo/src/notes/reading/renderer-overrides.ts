import type { SupportedTargetLanguage } from "../../../shared/supported-target-language";
import type { NoteBlockKind } from "../note-block-kind";
import type { ReadingNoteBlockRenderer } from "./reading-note-render-context";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";

export type ReadingNoteRendererOverrideRegistry<
	L extends SupportedTargetLanguage,
> = Partial<{
	[Family in UnitReadingFamilyFor<L>]: Partial<{
		[Kind in UnitReadingKindFor<L, Family>]: Partial<
			Record<
				Exclude<NoteBlockKind, "Routes">,
				ReadingNoteBlockRenderer<L, Family, Kind>
			>
		>;
	}>;
}>;

export type ReadingNoteRouteRendererOverrides<
	L extends SupportedTargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
> = Partial<
	Record<Exclude<NoteBlockKind, "Routes">, ReadingNoteBlockRenderer<L, F, K>>
>;

export function readingNoteRendererOverrideFor<
	L extends SupportedTargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	registry: ReadingNoteRendererOverrideRegistry<L>,
	route: ReadingNoteRouteKey<L, F, K>,
	blockKind: Exclude<NoteBlockKind, "Routes">,
): ReadingNoteBlockRenderer<L, F, K> | undefined {
	const familyRegistry = registry[route.family] as
		| Partial<Record<K, ReadingNoteRouteRendererOverrides<L, F, K>>>
		| undefined;
	return familyRegistry?.[route.kind]?.[blockKind];
}

export function selectReadingNoteRenderer<
	L extends SupportedTargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	defaultRenderer: ReadingNoteBlockRenderer<L, F, K>,
	override: ReadingNoteBlockRenderer<L, F, K> | undefined,
): ReadingNoteBlockRenderer<L, F, K> {
	return override ?? defaultRenderer;
}
