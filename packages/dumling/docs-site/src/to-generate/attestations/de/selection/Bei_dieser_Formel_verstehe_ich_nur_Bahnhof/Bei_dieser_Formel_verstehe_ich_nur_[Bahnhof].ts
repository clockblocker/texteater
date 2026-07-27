import type { AttestedSelection, Selection } from "dumling/types";

const deSelection043 = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "Bahnhof",

	surface: {
		language: "de",
		normalizedFullSurface: "nur Bahnhof verstehen",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "nur Bahnhof verstehen",
			lemmaKind: "Phraseme",
			lemmaSubKind: "Idiom",
			inherentFeatures: {},
			meaningInEmojis: "❓",
		},
	},
} satisfies Selection<"de", "Citation", "Phraseme", "Idiom">;

export const attestation = {
	selection: deSelection043,
	sentenceMarkdown: "Bei dieser Formel verstehe ich nur [Bahnhof].",
	classifierNotes:
		"Bahnhof is treated as a partial selection of the idiom nur Bahnhof verstehen, not as the lexical noun, because the sentence clearly uses the fixed idiomatic meaning 'understand nothing' rather than a literal station reading.",
	isVerified: true,
} as const satisfies AttestedSelection;
