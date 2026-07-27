import type { AttestedSelection, Selection } from "dumling/types";

const deSelection054 = {
	language: "de",
	spelledSelection: "Am",

	surface: {
		language: "de",
		normalizedFullSurface: "am",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "am",
			lemmaKind: "Construction",
			lemmaSubKind: "Fusion",
			inherentFeatures: {},
			meaningInEmojis: "📍",
		},
	},
} satisfies Selection<"de", "Citation", "Construction", "Fusion">;

export const attestation = {
	selection: deSelection054,
	sentenceMarkdown: "[Am] nächsten Morgen war alles anders.",
	classifierNotes:
		"Am is modeled as Construction/Fusion, parallel to zum and ins. Sentence-initial capitalization is treated as canonical here, and the emoji is for am itself rather than the surrounding temporal phrase.",
	classificationMistakes:
		'Do not mark sentence-initial capitalization alone as a spelling variant, and do not assign the emoji from the surrounding phrase. For this row, the earlier mistakes were `{ selectionFeatures: { spelling: "Variant" } }` and `meaningInEmojis` set to the temporal context rather than to `am` itself.',
	isVerified: true,
} as const satisfies AttestedSelection;
