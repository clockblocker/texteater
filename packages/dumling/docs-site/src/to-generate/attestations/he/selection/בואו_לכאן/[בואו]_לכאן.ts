import type { AttestedSelection, Selection } from "dumling/types";

const boUImperativeSelection = {
	language: "he",
	spelledSelection: "בואו",

	surface: {
		language: "he",
		normalizedFullSurface: "בואו",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Plur",
			person: "2",
		},
		lemma: {
			language: "he",
			canonicalLemma: "בוא",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "PAAL",
			},
			meaningInEmojis: "👋",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: boUImperativeSelection,
	sentenceMarkdown: "[בואו] לכאן.",
	classifierNotes:
		"בואו is an imperative plural form with mood Imp and no tense.",
} as const satisfies AttestedSelection;
