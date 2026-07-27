import type { AttestedSelection, Selection } from "dumling/types";

const deSelection040 = {
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
			meaningInEmojis: "🏊",
		},
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection040,
	sentenceMarkdown: "Sie sprang [ins] kalte Wasser.",
	classifierNotes:
		"Ins gets the same Construction/Fusion treatment as zum; the public DTO preserves the fused form intact.",
	isVerified: true,
} as const satisfies AttestedSelection;
