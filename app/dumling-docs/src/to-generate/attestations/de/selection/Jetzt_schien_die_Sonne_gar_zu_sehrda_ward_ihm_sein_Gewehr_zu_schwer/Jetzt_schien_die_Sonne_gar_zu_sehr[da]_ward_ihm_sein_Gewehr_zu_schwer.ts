import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "da",

	surface: {
		language: "de",
		normalizedFullSurface: "da",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "da",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "⏱️",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Jetzt schien die Sonne gar zu sehr,
[da] ward ihm sein Gewehr zu schwer.`,
	classifierNotes:
		"I treated `da` as a narrative temporal adverb meaning roughly `then`, not as the subordinating conjunction, because the clause stays V2 (`da ward ...`) instead of showing subordinate verb-final order.",
	isVerified: true,
} as const satisfies AttestedSelection;
