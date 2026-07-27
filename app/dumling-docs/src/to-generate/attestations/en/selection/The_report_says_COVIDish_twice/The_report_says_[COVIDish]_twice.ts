import type { AttestedSelection, Selection } from "dumling/types";

const covidXTokenSelection = {
	language: "en",
	spelledSelection: "COVID-ish",

	surface: {
		language: "en",
		normalizedFullSurface: "COVID-ish",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "COVID-ish",
			lemmaKind: "Lexeme",
			lemmaSubKind: "X",
			inherentFeatures: {
				foreign: "Yes",
			},
			meaningInEmojis: "🧪",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "X">;

export const attestation = {
	selection: covidXTokenSelection,
	sentenceMarkdown: "The report says [COVID-ish] twice.",
	classifierNotes:
		"The hybrid nonce token is X with Foreign=Yes because it resists clean POS assignment in isolation.",
} as const satisfies AttestedSelection;
