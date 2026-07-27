import type { AttestedSelection, Selection } from "dumling/types";

const thatDeterminerSelection = {
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
			lemmaSubKind: "DET",
			inherentFeatures: {
				pronType: "Dem",
			},
			meaningInEmojis: "👉",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "DET">;

export const attestation = {
	selection: thatDeterminerSelection,
	sentenceMarkdown: "Move [that] chair, please.",
	classifierNotes:
		"That before a noun is DET, distinct from pronominal and complementizer that.",
} as const satisfies AttestedSelection;
