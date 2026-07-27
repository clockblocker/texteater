import type { AttestedSelection, Selection } from "dumling/types";

const deSelection030 = {
	language: "de",
	spelledSelection: "deutschsprachigen",

	surface: {
		language: "de",
		normalizedFullSurface: "deutschsprachigen",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
		},
		lemma: {
			language: "de",
			canonicalLemma: "deutschsprachig",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "🗣️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection030,
	sentenceMarkdown: "Viele [deutschsprachigen] Quellen fehlen noch.",
	classifierNotes:
		"Deutschsprachigen looks noun-like in isolation but is annotated as an adjective inflection here.",
	isVerified: true,
} as const satisfies AttestedSelection;
