import { z } from "zod";

export const noteKindSchema = z.enum([
	"UnitReadingNote",
	"RouteNote",
	"ShadowNote",
]);

export type NoteKind = z.infer<typeof noteKindSchema>;
