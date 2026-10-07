import { z } from "zod";

/**
 * The Blocks a stored layout orders and hides. The Anchor Blocks are pinned
 * (tf-demo ADR 0006), so they are not among them.
 */
export const noteLayoutBlockKindSchema = z.enum([
	"Valency",
	"Definition",
	"Translations",
	"PersonalAnnotation",
	"Relations",
	"MorphologicalTree",
	"Fusion",
	"Routes",
]);

export type NoteLayoutBlockKind = z.infer<typeof noteLayoutBlockKindSchema>;

/** The registry key of a route's Heading Block, pinned first. */
type NoteHeadingBlockKind = "Heading";

/** The registry key of a route's Source Contexts Block, pinned after the Heading. */
type NoteSourceContextsBlockKind = "SourceContexts";

/** Every Block a route's registry can render: its Anchor and its laid-out Blocks. */
export type NoteBlockKind =
	| NoteHeadingBlockKind
	| NoteSourceContextsBlockKind
	| NoteLayoutBlockKind;
