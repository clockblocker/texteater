import type { AttestedSelection, Selection } from "dumling/types";

const deSelection013 = {
	language: "de",
	spelledSelection: "Kindern",

	surface: {
		language: "de",
		normalizedFullSurface: "Kindern",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Kind",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Neut",
			},
			meaningInEmojis: "🧒",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: deSelection013,
	sentenceMarkdown: "Mit den [Kindern] ist es nie langweilig.",
	classifierNotes:
		"Kindern is a dative plural noun with plural -n; the surface features carry both case and number.",
	isVerified: true,
} as const satisfies AttestedSelection;
