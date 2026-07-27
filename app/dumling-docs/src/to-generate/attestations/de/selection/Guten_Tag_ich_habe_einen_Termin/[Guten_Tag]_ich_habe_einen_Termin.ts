import type { AttestedSelection, Selection } from "dumling/types";

const deSelection048 = {
	language: "de",
	spelledSelection: "Guten Tag",

	surface: {
		language: "de",
		normalizedFullSurface: "Guten Tag",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "Guten Tag",
			lemmaKind: "Phraseme",
			lemmaSubKind: "DiscourseFormula",
			inherentFeatures: {
				discourseFormulaRole: "Greeting",
			},
			meaningInEmojis: "👋",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "DiscourseFormula">;

export const attestation = {
	selection: deSelection048,
	sentenceMarkdown: "[Guten Tag], ich habe einen Termin.",
	classifierNotes:
		"Guten Tag is treated as a greeting formula rather than as a compositional adjective plus noun phrase.",
	isVerified: true,
} as const satisfies AttestedSelection;
