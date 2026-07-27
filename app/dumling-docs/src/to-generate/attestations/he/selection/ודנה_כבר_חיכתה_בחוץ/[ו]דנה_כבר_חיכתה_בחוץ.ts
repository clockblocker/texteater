import type { AttestedSelection, Selection } from "dumling/types";

const vavCliticSelection = {
	language: "he",
	spelledSelection: "ו",

	surface: {
		language: "he",
		normalizedFullSurface: "ו",
		surfaceKind: "Citation",
		lemma: {
			language: "he",
			canonicalLemma: "ו",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Clitic",
			inherentFeatures: {},
			meaningInEmojis: "➕",
		},
	},
} satisfies Selection<"he", "Citation", "Morpheme", "Clitic">;

export const attestation = {
	selection: vavCliticSelection,
	sentenceMarkdown: "[ו]דנה כבר חיכתה בחוץ.",
	classifierNotes:
		"ו is modeled as a morpheme clitic rather than CCONJ to stress bound orthographic attachment.",
} as const satisfies AttestedSelection;
