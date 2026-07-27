import type { AttestedSelection, Selection } from "dumling/types";

const deSelection039 = {
	language: "de",
	spelledSelection: "zum",

	surface: {
		language: "de",
		normalizedFullSurface: "zum",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "zum",
			lemmaKind: "Construction",
			lemmaSubKind: "Fusion",
			inherentFeatures: {},
			meaningInEmojis: "➡️",
		},
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection039,
	sentenceMarkdown: "Er ging [zum] Bahnhof.",
	classifierNotes:
		"Zum is modeled as Construction/Fusion, with the fused form itself as the canonical lemma and citation surface.",
	isVerified: true,
} as const satisfies AttestedSelection;
