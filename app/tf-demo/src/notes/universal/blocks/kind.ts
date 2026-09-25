import { z } from "zod";

export const noteBlockKindSchema = z.enum([
	"Header",
	"SourceContexts",
	"Valency",
	"Definition",
	"Translations",
	"PersonalAnnotation",
	"Relations",
	"MorphologicalTree",
	"LexicalBreakdown",
	"Routes",
]);

export type NoteBlockKind = z.infer<typeof noteBlockKindSchema>;
