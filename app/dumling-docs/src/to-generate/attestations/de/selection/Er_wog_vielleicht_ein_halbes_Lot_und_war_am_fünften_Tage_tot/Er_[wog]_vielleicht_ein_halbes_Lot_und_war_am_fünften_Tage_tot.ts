import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "wog",

	surface: {
		language: "de",
		normalizedFullSurface: "wog",
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
			canonicalLemma: "wiegen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "⚖️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Er [wog] vielleicht ein halbes Lot –
und war am fünften Tage tot.
`,
	classifierNotes:
		"Here wog is the past finite form of wiegen in the 'have a weight of' sense, not a rocking or swaying reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
