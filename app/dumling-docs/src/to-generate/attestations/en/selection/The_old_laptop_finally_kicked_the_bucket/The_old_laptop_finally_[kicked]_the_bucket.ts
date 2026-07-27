import type { AttestedSelection, Selection } from "dumling/types";

const kickTheBucketPartialIdiomSelection = {
	language: "en",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "kicked",

	surface: {
		language: "en",
		normalizedFullSurface: "kick the bucket",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalLemma: "kick the bucket",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "💀",
		},
	},
} satisfies Selection<"en", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: kickTheBucketPartialIdiomSelection,
	sentenceMarkdown: "The old laptop finally [kicked] the bucket.",
	classifierNotes:
		"The literal verb is inflected in the sentence, but the idiom entry stays citation-form only.",
} as const satisfies AttestedSelection;
