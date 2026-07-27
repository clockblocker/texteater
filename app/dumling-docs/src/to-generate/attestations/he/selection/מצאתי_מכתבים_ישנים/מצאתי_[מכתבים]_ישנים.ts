import type { AttestedSelection, Selection } from "dumling/types";

const michtavimNounSelection = {
	language: "he",
	spelledSelection: "מכתבים",

	surface: {
		language: "he",
		normalizedFullSurface: "מכתבים",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Plur",
		},
		lemma: {
			language: "he",
			canonicalLemma: "מכתב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "✉️",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: michtavimNounSelection,
	sentenceMarkdown: "מצאתי [מכתבים] ישנים.",
	classifierNotes:
		"מכתבים is the plural noun from מכתב, not a verb-root attestation.",
} as const satisfies AttestedSelection;
