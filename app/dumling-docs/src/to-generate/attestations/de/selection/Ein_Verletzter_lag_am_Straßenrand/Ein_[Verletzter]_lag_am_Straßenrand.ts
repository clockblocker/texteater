import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Verletzter",

	surface: {
		language: "de",
		normalizedFullSurface: "Verletzter",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Verletzter",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🤕",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ein [Verletzter] lag am Straßenrand.",
	classifierNotes:
		"Verletzter is a substantivized participial form used as a noun here. The highlighted form is already citation-shaped for this nominal reading, so it stays `Surface/Citation` and is classified as `NOUN` rather than `ADJ` or `VERB`.",
	isVerified: true,
} as const satisfies AttestedSelection;
