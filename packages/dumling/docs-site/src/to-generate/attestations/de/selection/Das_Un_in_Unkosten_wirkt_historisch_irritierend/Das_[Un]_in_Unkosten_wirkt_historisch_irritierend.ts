import type { AttestedSelection, Selection } from "dumling/types";

const deSelection050 = {
	language: "de",
	selectionFeatures: { coverage: "Partial", spelling: "Variant" },
	spelledSelection: "Un",

	surface: {
		language: "de",
		normalizedFullSurface: "un-",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "un-",
			lemmaKind: "Morpheme",
			lemmaSubKind: "Prefix",
			inherentFeatures: {},
			meaningInEmojis: "🚫",
		},
	},
} satisfies Selection<"de", "Citation", "Morpheme", "Prefix">;

export const attestation = {
	selection: deSelection050,
	sentenceMarkdown: "Das [Un]- in Unkosten wirkt historisch irritierend.",
	classifierNotes:
		"The bound prefix is represented with the canonical hyphenated lemma un-, while the selected spelling excludes the hyphen.",
	isVerified: true,
} as const satisfies AttestedSelection;
