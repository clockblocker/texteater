import type { AttestedSelection, Selection } from "dumling/types";

const yadayimDualSelection = {
	language: "he",
	spelledSelection: "ידיים",

	surface: {
		language: "he",
		normalizedFullSurface: "ידיים",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			number: "Dual",
		},
		lemma: {
			language: "he",
			canonicalLemma: "יד",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Fem",
			},
			meaningInEmojis: "🤲",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	selection: yadayimDualSelection,
	sentenceMarkdown: "רחצתי [ידיים].",
	classifierNotes: "ידיים is a dual-number surface for a paired body part.",
} as const satisfies AttestedSelection;
