import type { AttestedSelection, Selection } from "dumling/types";

const deSelection034 = {
	language: "de",
	spelledSelection: "seinen",

	surface: {
		language: "de",
		normalizedFullSurface: "seinen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			gender: "Masc",
			number: "Sing",
			"gender[psor]": "Masc",
			"number[psor]": "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "sein",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				person: "3",
				poss: "Yes",
				pronType: "Prs",
			},
			meaningInEmojis: "👦",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection034,
	sentenceMarkdown: "Er vergaß [seinen] Schlüssel im Büro.",
	classifierNotes:
		"`Seinen` is the accusative masculine singular possessive determiner agreeing with Schlüssel. Here the subject `Er` makes the possessor reading specifically 3rd-person masculine singular, so the separate possessor features are justified.",
	classificationMistakes:
		"Do not set meaningInEmojis from the possessed noun phrase when the selection is a possessive determiner. The earlier mistake here was using a key emoji for `seinen` instead of representing the determiner's `his` meaning.",
	isVerified: true,
} as const satisfies AttestedSelection;
