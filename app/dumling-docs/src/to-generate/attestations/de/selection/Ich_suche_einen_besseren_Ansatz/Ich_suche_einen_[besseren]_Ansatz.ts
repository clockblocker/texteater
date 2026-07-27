import type { AttestedSelection, Selection } from "dumling/types";

const deSelection027 = {
	language: "de",
	spelledSelection: "besseren",

	surface: {
		language: "de",
		normalizedFullSurface: "besseren",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			degree: "Cmp",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "gut",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADJ",
			inherentFeatures: {},
			meaningInEmojis: "📈",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	selection: deSelection027,
	sentenceMarkdown: "Ich suche einen [besseren] Ansatz.",
	classifierNotes:
		"Besseren is a comparative adjective with accusative masculine singular agreement.",
	isVerified: true,
} as const satisfies AttestedSelection;
