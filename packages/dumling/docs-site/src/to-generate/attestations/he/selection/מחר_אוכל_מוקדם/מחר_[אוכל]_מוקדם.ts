import type { AttestedSelection, Selection } from "dumling/types";

const ochalVerbSelection = {
	language: "he",
	spelledSelection: "אוכל",

	surface: {
		language: "he",
		normalizedFullSurface: "אוכל",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Sing",
			person: "1",
			tense: "Fut",
		},
		lemma: {
			language: "he",
			canonicalLemma: "אכל",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "PAAL",
			},
			meaningInEmojis: "🍽️",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: ochalVerbSelection,
	sentenceMarkdown: "מחר [אוכל] מוקדם.",
	classifierNotes:
		"אוכל is the future first-person verb from אכל, separated from the noun homograph.",
} as const satisfies AttestedSelection;
