import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Sieh",

	surface: {
		language: "de",
		normalizedFullSurface: "sieh",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "sehen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "👀",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `[Sieh] einmal, hier steht er, 
pfui, der Struwwelpeter!`,
	classifierNotes:
		"I kept Sieh as the imperative inflection of sehen rather than treating Sieh einmal as one larger formula; the sentence-initial capital remains only in spelledSelection.",
	isVerified: true,
} as const satisfies AttestedSelection;
