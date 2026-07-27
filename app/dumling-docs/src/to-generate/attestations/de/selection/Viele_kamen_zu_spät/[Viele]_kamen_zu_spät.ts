import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "Viele",

	surface: {
		language: "de",
		normalizedFullSurface: "viele",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "viel",
			lemmaKind: "Lexeme",
			lemmaSubKind: "PRON",
			inherentFeatures: {
				pronType: "Ind",
			},
			meaningInEmojis: "👥",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "[Viele] kamen zu spät.",
	classifierNotes:
		"Viele is annotated as PRON because it stands substantively for a plural group with no overt noun head. In attributive use, as in viele Leute, the same lexical item would be DET instead.",
	isVerified: true,
} as const satisfies AttestedSelection;
