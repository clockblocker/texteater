import type { AttestedSelection, Selection } from "dumling/types";

const yerushalayimSelection = {
	language: "he",
	spelledSelection: "ירושלים",

	surface: {
		language: "he",
		normalizedFullSurface: "ירושלים",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
		},
		lemma: {
			language: "he",
			canonicalLemma: "ירושלים",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PROPN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "🏙️",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "PROPN">;

export const attestation = {
	selection: yerushalayimSelection,
	sentenceMarkdown: "[ירושלים] יפה בלילה.",
	classifierNotes:
		"ירושלים is a proper noun with feminine inherent gender and singular surface number.",
} as const satisfies AttestedSelection;
