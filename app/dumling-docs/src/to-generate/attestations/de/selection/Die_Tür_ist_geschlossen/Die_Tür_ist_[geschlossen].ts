import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "geschlossen",

	surface: {
		language: "de",
		normalizedFullSurface: "geschlossen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "schließen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🔒",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Die Tür ist [geschlossen].",
	classifierNotes:
		"Geschlossen is treated here as a bare predicative Partizip-II form of schließen. Under the stricter German participle rule, non-attributive participles of lexical verbs stay VERB even when the clause describes a resulting state.",
	isVerified: true,
} as const satisfies AttestedSelection;
