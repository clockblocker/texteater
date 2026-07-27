import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Meckern",

	surface: {
		language: "de",
		normalizedFullSurface: "Meckern",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Meckern",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "😤",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Sein ständiges [Meckern] nervt.",
	classifierNotes:
		"Meckern is treated here as a substantivized infinitive, so the learner-facing unit is a neuter noun rather than the verb `meckern`. The selected form is citation-shaped for this nominal reading, so it stays `Surface/Citation`.",
	isVerified: true,
} as const satisfies AttestedSelection;
