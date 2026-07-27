import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "entzwei",

	surface: {
		language: "de",
		normalizedFullSurface: "entzwei",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "entzwei",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "💥",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die schoß das Häschen ganz [entzwei];
da rief die Frau: »O wei! O wei!«`,
	classifierNotes:
		"I treated entzwei as a lexical adjective, following dictionary treatment, even though in this resultative use it feels adverb-like on the surface. Because there is no overt inflection here, the surface is stored as a citation-shaped ADJ rather than as an inflected form.",
	isVerified: true,
} as const satisfies AttestedSelection;
