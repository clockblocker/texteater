import { z } from "zod";

export const noteBlockKindSchema = z.enum([
	"Header",
	"SourceContexts",
	"Definition",
	"Translations",
	"PersonalAnnotation",
	"Relations",
	"MorphologicalTree",
	"LexicalBreakdown",
	"Routes",
]);

export type NoteBlockKind = z.infer<typeof noteBlockKindSchema>;
