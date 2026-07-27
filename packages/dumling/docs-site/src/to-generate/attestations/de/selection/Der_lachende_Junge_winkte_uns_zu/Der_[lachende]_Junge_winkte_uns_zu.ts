import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "lachende",

	surface: {
		language: "de",
		normalizedFullSurface: "lachende",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "lachend",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "😄",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "Der [lachende] Junge winkte uns zu.",
	classifierNotes:
		"Lachende is an attributive participial adjective modifying Junge with nominative masculine singular agreement. Under the repo's German participle rule, noun-modifying P1 forms like this classify as ADJ rather than VERB.",
	isVerified: true,
} as const satisfies AttestedSelection;
