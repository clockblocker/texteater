import type { AttestedSelection, Selection } from "dumling/types";

const thatSubordinatorSelection = {
	language: "en",
	spelledSelection: "that",

	surface: {
		language: "en",
		normalizedFullSurface: "that",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "that",
			lemmaKind: "Lexeme",
			lemmaSubKind: "SCONJ",
			inherentFeatures: {},
			meaningInEmojis: "🔗",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	selection: thatSubordinatorSelection,
	sentenceMarkdown: "I know [that] you tried.",
	classifierNotes:
		"Complementizer that is SCONJ; no clause-type feature exists, so POS carries the distinction.",
} as const satisfies AttestedSelection;
