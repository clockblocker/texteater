import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "geschriebene",

	surface: {
		language: "de",
		normalizedFullSurface: "geschriebene",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "geschrieben",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "✍️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Der [geschriebene] Brief lag auf dem Tisch.",
	classifierNotes:
		"Geschriebene is an attributive participial adjective modifying Brief with nominative masculine singular agreement. Under the current German rule, attributive participles classify as ADJ here rather than as VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
