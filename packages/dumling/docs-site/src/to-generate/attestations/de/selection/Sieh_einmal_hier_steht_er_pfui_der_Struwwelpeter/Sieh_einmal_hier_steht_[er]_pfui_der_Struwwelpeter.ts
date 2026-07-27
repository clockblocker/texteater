import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "er",

	surface: {
		language: "de",
		normalizedFullSurface: "er",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "er",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				person: "3",
				pronType: "Prs",
			},
			meaningInEmojis: "👦",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht [er], 
pfui, der Struwwelpeter!`,
	classifierNotes: "",
	isVerified: true,
} as const satisfies AttestedSelection;
