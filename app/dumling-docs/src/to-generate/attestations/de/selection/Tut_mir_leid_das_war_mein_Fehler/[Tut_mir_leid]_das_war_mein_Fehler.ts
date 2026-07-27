import type { AttestedSelection, Selection } from "dumling/types";

const deSelection049 = {
	language: "de",
	spelledSelection: "Tut mir leid",

	surface: {
		language: "de",
		normalizedFullSurface: "tut mir leid",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "tut mir leid",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {
				discourseFormulaRole: "Apology",
			},
			meaningInEmojis: "🙇",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection049,
	sentenceMarkdown: "[Tut mir leid], das war mein Fehler.",
	classifierNotes:
		"Tut mir leid is stored as an apology phraseme, not as a literal finite-verb selection.",
	isVerified: true,
} as const satisfies AttestedSelection;
