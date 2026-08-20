import type { z } from "zod";

import type {
	NoteBlockKindFor,
	NoteData,
	NoteDataFor,
	NoteKind,
	TargetLanguage,
} from "../../src/notes";
import {
	type NOTE_BLOCK_KIND_FOR,
	type noteBlockKindSchema,
	type noteKindSchema,
	renderNote,
	targetLanguageSchema,
} from "../../src/notes";
import type {
	RouteNoteData,
	RouteNotePresentationCapabilities,
} from "../../src/notes/route";
import type {
	ShadowNoteData,
	ShadowNotePresentationCapabilities,
} from "../../src/notes/shadow";

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Assert<Condition extends true> = Condition;

export type NoteKindsComeFromTheSchema = Assert<
	Equal<NoteKind, z.infer<typeof noteKindSchema>>
>;
export type BlockKindsComeFromTheSchema = Assert<
	Equal<keyof typeof NOTE_BLOCK_KIND_FOR, NoteKind>
>;
export type NoteDataUsesEveryStableKind = Assert<
	Equal<NoteData["kind"], NoteKind>
>;
export type ReadingDataIsIndexedFromTheOnlyDto = Assert<
	Equal<
		NoteDataFor<"UnitReadingNote">,
		Extract<NoteData, { kind: "UnitReadingNote" }>
	>
>;
export type ReadingBlocksExcludeRoutes = Assert<
	Equal<
		NoteBlockKindFor<"UnitReadingNote">,
		Exclude<z.infer<typeof noteBlockKindSchema>, "Routes">
	>
>;

const targetLanguage: TargetLanguage = "de";
void targetLanguage;

// @ts-expect-error Only app-configured target languages are accepted.
const unconfiguredTargetLanguage: TargetLanguage = "en";
void unconfiguredTargetLanguage;

const readingBlock: NoteBlockKindFor<"UnitReadingNote"> = "SourceContexts";
void readingBlock;

// @ts-expect-error Routes do not apply to Reading Notes.
const readingRoutes: NoteBlockKindFor<"UnitReadingNote"> = "Routes";
void readingRoutes;

declare const routeNote: RouteNoteData;
declare const routeCapabilities: RouteNotePresentationCapabilities;
declare const shadowNote: ShadowNoteData;
declare const shadowCapabilities: ShadowNotePresentationCapabilities;
renderNote(routeNote, routeCapabilities);
renderNote(shadowNote, shadowCapabilities);
// @ts-expect-error Route Notes cannot receive Shadow Note capabilities.
renderNote(routeNote, shadowCapabilities);

targetLanguageSchema satisfies z.ZodType<TargetLanguage>;
