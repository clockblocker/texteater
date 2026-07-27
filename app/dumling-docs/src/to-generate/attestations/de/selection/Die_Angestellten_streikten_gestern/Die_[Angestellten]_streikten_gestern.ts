import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Angestellten",

	surface: {
		language: "de",
		normalizedFullSurface: "Angestellten",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Angestellter",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🧑‍💼",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [Angestellten] streikten gestern.",
	classifierNotes:
		"Angestellten is a substantivized participial form used here as a plural noun. Under the German rule for nominalized verb forms, it classifies as NOUN rather than ADJ or VERB; subject position and verb agreement support nominative plural.",
	isVerified: true,
} as const satisfies AttestedSelection;
