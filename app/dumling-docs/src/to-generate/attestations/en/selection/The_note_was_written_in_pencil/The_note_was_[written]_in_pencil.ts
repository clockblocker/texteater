import type { AttestedSelection, Selection } from "dumling/types";

const writtenPassiveParticipleSelection = {
	language: "en",
	spelledSelection: "written",

	surface: {
		language: "en",
		normalizedFullSurface: "written",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			verbForm: "Part",
			voice: "Pass",
		},
		lemma: {
			language: "en",
			canonicalLemma: "write",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "✍️",
		},
	},
} satisfies Selection<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: writtenPassiveParticipleSelection,
	sentenceMarkdown: "The note was [written] in pencil.",
	classifierNotes:
		"Voice=Pass is context-sensitive for English participles; it is included to test whether the model accepts contextual morphology.",
} as const satisfies AttestedSelection;
