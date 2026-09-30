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
	"Fusion",
	"Routes",
]);

export type NoteBlockKind = z.infer<typeof noteBlockKindSchema>;
