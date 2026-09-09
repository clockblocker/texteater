import { z } from "zod";

export const noteKindSchema = z.enum([
	"Reading",
	"Lemma",
	"Surface",
	"Attestation",
	"Shadow",
]);

export type NoteKind = z.infer<typeof noteKindSchema>;
