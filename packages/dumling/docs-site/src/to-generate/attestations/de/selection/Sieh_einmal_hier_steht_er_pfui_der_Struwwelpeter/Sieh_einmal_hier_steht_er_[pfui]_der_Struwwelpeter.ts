import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "pfui",

	surface: {
		language: "de",
		normalizedFullSurface: "pfui",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "pfui",
			lemmaKind: "Lexeme",
			lemmaSubKind: "INTJ",
			inherentFeatures: {},
			meaningInEmojis: "🤢",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Sieh einmal, hier steht er, 
[pfui], der Struwwelpeter!`,
	classifierNotes:
		"Pfui is treated as a plain interjection. I did not force `partType: Res` because this use expresses disgust/exclamation, not the schema's narrower response-particle reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
