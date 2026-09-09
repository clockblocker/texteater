import type { z } from "zod";

import type {
	NoteBlockRenderer,
	NoteBlockRendererRegistry,
	NoteData,
	NoteDataFor,
	NoteKind,
	SurfaceAnalysisDescriptionRenderer,
	SurfaceAnalysisDescriptionRendererRegistry,
	SurfaceNotePresentationCapabilities,
	TargetLanguage,
} from "../../src/notes";
import {
	NOTE_BLOCK_RENDERER_REGISTRY,
	type noteKindSchema,
	renderNote,
	targetLanguageSchema,
} from "../../src/notes";
import type { RouteNotePresentationCapabilities } from "../../src/notes/route";
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
export type NoteDataUsesEveryKind = Assert<Equal<NoteData["kind"], NoteKind>>;
export type ReadingDataIsIndexedFromTheOnlyDto = Assert<
	Equal<
		NoteDataFor<"Reading">,
		Extract<NoteData, { readonly kind: "Reading" }>
	>
>;

const targetLanguage: TargetLanguage = "de";
void targetLanguage;
// @ts-expect-error Only app-configured target languages are accepted.
const unconfiguredTargetLanguage: TargetLanguage = "en";
void unconfiguredTargetLanguage;

NOTE_BLOCK_RENDERER_REGISTRY satisfies NoteBlockRendererRegistry;
NOTE_BLOCK_RENDERER_REGISTRY.de satisfies NoteBlockRendererRegistry<"de">;
NOTE_BLOCK_RENDERER_REGISTRY.de.Surface satisfies NoteBlockRendererRegistry<
	"de",
	"Surface"
>;
NOTE_BLOCK_RENDERER_REGISTRY.de.Reading.Lexeme?.VERB satisfies
	| NoteBlockRendererRegistry<"de", "Reading", "Lexeme", "VERB">
	| undefined;

const nounLemmaRenderer: NoteBlockRenderer<"de", "Lemma", "Lexeme", "NOUN"> = (
	context,
) => {
	context.noteData.kind satisfies "Lemma";
	context.noteData.presented.kind satisfies "NOUN";
	return null;
};

({
	Lexeme: { NOUN: { Header: nounLemmaRenderer } },
}) satisfies NoteBlockRendererRegistry<"de", "Lemma">;

({
	Lexeme: {
		VERB: {
			// @ts-expect-error A NOUN Lemma renderer cannot be registered for VERB.
			Header: nounLemmaRenderer,
		},
	},
}) satisfies NoteBlockRendererRegistry<"de", "Lemma">;

({
	// @ts-expect-error Surface Note slices are direct Block maps, not grammatical routes.
	Lexeme: { NOUN: { Header: nounLemmaRenderer } },
}) satisfies NoteBlockRendererRegistry<"de", "Surface">;

const nounAnalysisDescription: SurfaceAnalysisDescriptionRenderer<
	"de",
	"Lexeme",
	"NOUN"
> = (analysis) => {
	analysis.presented.lemma.kind satisfies "NOUN";
	return null as never;
};

({
	Lexeme: { NOUN: nounAnalysisDescription },
}) satisfies SurfaceAnalysisDescriptionRendererRegistry<"de">;

({
	Lexeme: {
		// @ts-expect-error A NOUN description cannot format VERB inflectional features.
		VERB: nounAnalysisDescription,
	},
}) satisfies SurfaceAnalysisDescriptionRendererRegistry<"de">;

declare const lemmaNote: NoteDataFor<"Lemma">;
declare const lemmaCapabilities: RouteNotePresentationCapabilities;
declare const surfaceNote: NoteDataFor<"Surface">;
declare const surfaceCapabilities: SurfaceNotePresentationCapabilities;
declare const shadowNote: ShadowNoteData;
declare const shadowCapabilities: ShadowNotePresentationCapabilities;
renderNote(lemmaNote, lemmaCapabilities);
renderNote(surfaceNote, surfaceCapabilities);
renderNote(shadowNote, shadowCapabilities);
// @ts-expect-error Lemma Notes cannot receive Shadow Note capabilities.
renderNote(lemmaNote, shadowCapabilities);
targetLanguageSchema satisfies z.ZodType<TargetLanguage>;
