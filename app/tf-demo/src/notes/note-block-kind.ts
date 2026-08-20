import { type ZodType, z } from "zod";

import type { NoteKind } from "./note-kind";

export const noteBlockKindSchema = z.enum([
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
	"Relations",
	"MorphologicalTree",
	"LexicalBreakdown",
	"Routes",
]);

export type NoteBlockKind = z.infer<typeof noteBlockKindSchema>;

export const unitReadingNoteBlockKindSchema = noteBlockKindSchema.exclude([
	"Routes",
]);
export const routeNoteBlockKindSchema = noteBlockKindSchema.extract([
	"Header",
	"Routes",
]);
export const shadowNoteBlockKindSchema = noteBlockKindSchema.extract([
	"Header",
	"Relations",
]);

function defineNoteBlockKindRegistry<
	const Registry extends Record<NoteKind, ZodType<NoteBlockKind>>,
>(registry: Registry): Registry {
	return registry;
}

export const NOTE_BLOCK_KIND_FOR = defineNoteBlockKindRegistry({
	UnitReadingNote: unitReadingNoteBlockKindSchema,
	RouteNote: routeNoteBlockKindSchema,
	ShadowNote: shadowNoteBlockKindSchema,
});

export type NoteBlockKindFor<K extends NoteKind> = z.infer<
	(typeof NOTE_BLOCK_KIND_FOR)[K]
>;
