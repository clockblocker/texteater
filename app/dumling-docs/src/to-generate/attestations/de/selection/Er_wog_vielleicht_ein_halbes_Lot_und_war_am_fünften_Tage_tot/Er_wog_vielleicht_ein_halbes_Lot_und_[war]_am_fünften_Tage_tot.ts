import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "war",

	surface: {
		language: "de",
		normalizedFullSurface: "war",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "sein",
			lemmaKind: "Lexeme",
			lemmaSubKind: "AUX",
			inherentFeatures: {},
			meaningInEmojis: "🧩",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er wog vielleicht ein halbes Lot –
und [war] am fünften Tage tot.
`,
	classifierNotes:
		"I kept war under the AUX lemma sein, following the repo's treatment of finite and participial sein forms as auxiliary/copular rather than splitting off a separate lexical verb entry.",
	isVerified: true,
} as const satisfies AttestedSelection;
