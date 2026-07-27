import type { AttestedSelection, Selection } from "dumling/types";

const readPastHomographSelection = {
	language: "en",
	spelledSelection: "read",

	surface: {
		language: "en",
		normalizedFullSurface: "read",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "en",
			canonicalLemma: "read",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "📖",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: readPastHomographSelection,
	sentenceMarkdown: "Yesterday I [read] the warning twice.",
	classifierNotes:
		"Past-tense read is orthographically identical to the citation form; the distinction lives only in surfaceKind and inflectionalFeatures.",
} as const satisfies AttestedSelection;
