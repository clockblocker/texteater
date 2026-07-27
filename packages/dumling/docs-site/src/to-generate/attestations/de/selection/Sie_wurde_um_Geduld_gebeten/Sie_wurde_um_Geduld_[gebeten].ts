import type { AttestedSelection, Selection } from "dumling/types";

const deSelection026 = {
	language: "de",
	spelledSelection: "gebeten",

	surface: {
		language: "de",
		normalizedFullSurface: "gebeten",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "bitten",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasGovPrep: "um",
			},
			meaningInEmojis: "🙏",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection026,
	sentenceMarkdown: "Sie wurde um Geduld [gebeten].",
	classifierNotes:
		"The sentence is passive, but the selected participle is stored without voice because the form itself is simply the participle of bitten.",
	isVerified: true,
} as const satisfies AttestedSelection;
