import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "eingezeichneten",

	surface: {
		language: "de",
		normalizedFullSurface: "eingezeichneten",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "eingezeichnet",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🗺️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die [eingezeichneten] Seen sind jetzt besser zu sehen.",
	classifierNotes:
		"Eingezeichneten is annotated as an attributive adjective inflection here. Unlike bare predicative eingezeichnet, which this repo keeps under the verb einzeichnen, the noun-modifying participial form in die eingezeichneten Seen goes to ADJ.",
	isVerified: true,
} as const satisfies AttestedSelection;
