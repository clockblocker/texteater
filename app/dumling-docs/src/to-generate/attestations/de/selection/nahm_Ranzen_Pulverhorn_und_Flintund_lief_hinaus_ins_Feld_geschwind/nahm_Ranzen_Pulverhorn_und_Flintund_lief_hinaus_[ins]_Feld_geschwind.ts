import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "ins",

	surface: {
		language: "de",
		normalizedFullSurface: "ins",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "ins",
			lemmaKind: "Construction",
			lemmaSubKind: "Fusion",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `nahm Ranzen, Pulverhorn und Flint
und lief hinaus [ins] Feld geschwind`,
	classifierNotes:
		"Ins is the usual German fused form, so Dumling keeps it as Construction/Fusion rather than decomposing it into in + das.",
	isVerified: true,
} as const satisfies AttestedSelection;
