import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "lasse",

	surface: {
		language: "de",
		normalizedFullSurface: "lasse",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "1",
			tense: "Pres",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "lassen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Ich [lasse] mir morgen die Haare schneiden.",
	classifierNotes:
		"Lasse is the 1st-person singular present indicative form of the lexical verb lassen heading the causative construction.",
	isVerified: true,
} as const satisfies AttestedSelection;
