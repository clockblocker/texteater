import type { AttestedSelection, Selection } from "dumling/types";

const deSelection045 = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "Nagel",

	surface: {
		language: "de",
		normalizedFullSurface: "den Nagel auf den Kopf treffen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "den Nagel auf den Kopf treffen",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "🎯",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection045,
	sentenceMarkdown: "Damit triffst du den [Nagel] auf den Kopf.",
	classifierNotes:
		"The inflected sentence form points to the citation phraseme; the selected token is only an internal component.",
	isVerified: true,
} as const satisfies AttestedSelection;
