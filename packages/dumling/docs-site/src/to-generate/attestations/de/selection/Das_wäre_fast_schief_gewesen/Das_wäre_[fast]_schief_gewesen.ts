import type { AttestedSelection, Selection } from "dumling/types";

const fastAdverbSelection = {
	language: "de",
	spelledSelection: "fast",

	surface: {
		language: "de",
		normalizedFullSurface: "fast",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "fast",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "🤏",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: fastAdverbSelection,
	sentenceMarkdown: "Das wäre [fast] schief gewesen.",
	classifierNotes:
		"Fast is the approximative adverb here, modifying the predication schief gewesen rather than functioning as an adjective or particle.",
	isVerified: true,
} as const satisfies AttestedSelection;
