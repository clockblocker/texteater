import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "lachend",

	surface: {
		language: "de",
		normalizedFullSurface: "lachend",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Pres",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "lachen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "😄",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Sie kam [lachend] herein.",
	classifierNotes:
		"Lachend is the present participial form of lachen used non-attributively, so under the repo's German participle rule it stays VERB rather than shifting to ADJ or ADV.",
	isVerified: true,
} as const satisfies AttestedSelection;
