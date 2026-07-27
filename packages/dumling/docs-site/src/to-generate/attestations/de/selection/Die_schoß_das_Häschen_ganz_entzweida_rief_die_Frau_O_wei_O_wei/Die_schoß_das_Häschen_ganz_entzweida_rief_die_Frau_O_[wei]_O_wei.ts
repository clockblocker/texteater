import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "wei",

	surface: {
		language: "de",
		normalizedFullSurface: "o wei",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "o wei",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {
				discourseFormulaRole: "Reaction",
			},
			meaningInEmojis: "😱",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die schoß das Häschen ganz entzwei;
da rief die Frau: »O [wei]! O wei!«`,
	classifierNotes:
		"This is the same reaction formula analysis as the O selection: wei is treated as a partial slice of the discourse formula o wei, not as an independent lexeme.",
	isVerified: true,
} as const satisfies AttestedSelection;
