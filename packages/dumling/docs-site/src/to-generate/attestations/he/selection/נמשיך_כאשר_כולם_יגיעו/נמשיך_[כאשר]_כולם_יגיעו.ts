import type { AttestedSelection, Selection } from "dumling/types";

const kaasherSubordinatorSelection = {
	language: "he",
	spelledSelection: "כאשר",

	surface: {
		language: "he",
		normalizedFullSurface: "כאשר",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "כאשר",
			lemmaKind: "Lexeme",
			lemmaSubKind: "SCONJ",
			inherentFeatures: {
				case: "Tem",
			},
			meaningInEmojis: "⏱️",
		},
	},
} satisfies Selection<"he", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	selection: kaasherSubordinatorSelection,
	sentenceMarkdown: "נמשיך [כאשר] כולם יגיעו.",
	classifierNotes:
		"כאשר is SCONJ with temporal case because the schema exposes that feature for Hebrew subordinators.",
} as const satisfies AttestedSelection;
