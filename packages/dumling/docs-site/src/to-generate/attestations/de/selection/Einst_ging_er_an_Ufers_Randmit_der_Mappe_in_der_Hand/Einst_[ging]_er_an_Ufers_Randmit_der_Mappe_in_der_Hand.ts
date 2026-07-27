import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "ging",

	surface: {
		language: "de",
		normalizedFullSurface: "ging",
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
			canonicalLemma: "gehen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🚶",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Einst [ging] er an Ufers Rand
mit der Mappe in der Hand.`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
