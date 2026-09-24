import type { SupportedTargetLanguage } from "../../../../shared/supported-target-language";
import type { NoteKind } from "../note/kind";
import type { NoteBlockKind } from "./kind";
import type {
	GrammaticalNoteKind,
	NoteBlockRenderer,
	NoteFamilyFor,
	NoteLemmaKindFor,
} from "./renderer";

type BlockMap<
	L extends SupportedTargetLanguage,
	N extends NoteKind,
	F extends NoteFamilyFor<L>,
	K extends NoteLemmaKindFor<L, F>,
> = Partial<Record<NoteBlockKind, NoteBlockRenderer<L, N, F, K>>>;
type GrammaticalRegistry<
	L extends SupportedTargetLanguage,
	N extends GrammaticalNoteKind,
> = Partial<{
	[F in NoteFamilyFor<L>]: Partial<{
		[K in NoteLemmaKindFor<L, F>]: BlockMap<L, N, F, K>;
	}>;
}>;
type NoteRegistry<
	L extends SupportedTargetLanguage,
	N extends NoteKind,
> = N extends "Surface"
	? Partial<Record<NoteBlockKind, NoteBlockRenderer<L, "Surface">>>
	: N extends GrammaticalNoteKind
		? GrammaticalRegistry<L, N>
		: never;
type LanguageRegistry<L extends SupportedTargetLanguage> = {
	[N in NoteKind]: NoteRegistry<L, N>;
};

export type RendererRegistry<
	L extends SupportedTargetLanguage | never = never,
	N extends NoteKind | never = never,
	F extends L extends SupportedTargetLanguage
		? NoteFamilyFor<L>
		: never = never,
	K extends string | never = never,
> = [L] extends [never]
	? { [Language in SupportedTargetLanguage]: LanguageRegistry<Language> }
	: L extends SupportedTargetLanguage
		? [N] extends [never]
			? LanguageRegistry<L>
			: N extends NoteKind
				? [F] extends [never]
					? NoteRegistry<L, N>
					: N extends GrammaticalNoteKind
						? F extends NoteFamilyFor<L>
							? [K] extends [never]
								? Partial<{
										[K2 in NoteLemmaKindFor<
											L,
											F
										>]: BlockMap<L, N, F, K2>;
									}>
								: K extends NoteLemmaKindFor<L, F>
									? BlockMap<L, N, F, K>
									: never
							: never
						: never
				: never
		: never;
