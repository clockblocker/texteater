import type { AttestedSelection, Selection } from "dumling/types";

const holchimParticipleSelection = {
	language: "he",
	spelledSelection: "הולכים",

	surface: {
		language: "he",
		normalizedFullSurface: "הולכים",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Plur",
			verbForm: "Part",
		},
		lemma: {
			language: "he",
			canonicalLemma: "הלך",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "PAAL",
			},
			meaningInEmojis: "🚶",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: holchimParticipleSelection,
	sentenceMarkdown: "אנחנו [הולכים] עכשיו.",
	classifierNotes:
		"Present-like verbal forms are represented as verbForm Part rather than tense Pres.",
} as const satisfies AttestedSelection;
