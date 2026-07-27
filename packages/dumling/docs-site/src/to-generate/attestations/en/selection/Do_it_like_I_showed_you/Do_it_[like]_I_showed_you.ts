import type { AttestedSelection, Selection } from "dumling/types";

const likeSubordinatorSelection = {
	language: "en",
	spelledSelection: "like",

	surface: {
		language: "en",
		normalizedFullSurface: "like",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "like",
			lemmaKind: "Lexeme",
			lemmaSubKind: "SCONJ",
			inherentFeatures: {
				style: "Vrnc",
			},
			meaningInEmojis: "↔️",
		},
	},
} satisfies Selection<"en", "Citation", "Lexeme", "SCONJ">;

export const attestation = {
	selection: likeSubordinatorSelection,
	sentenceMarkdown: "Do it [like] I showed you.",
	classifierNotes:
		"Like as a subordinator is marked SCONJ with vernacular style because many registers prefer as.",
} as const satisfies AttestedSelection;
