import { z } from "zod";

/**
 * The Blocks of a Note's Body, the only ones a stored layout orders and hides.
 * The Heading Block is pinned first (tf-demo ADR 0006), so it is not one.
 */
export const noteBodyBlockKindSchema = z.enum([
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

export type NoteBodyBlockKind = z.infer<typeof noteBodyBlockKindSchema>;

/** The registry key of a route's Heading Block. */
export type NoteHeadingBlockKind = "Header";

/** Every Block a route's registry can render: its Heading and its Body. */
export type NoteBlockKind = NoteHeadingBlockKind | NoteBodyBlockKind;
