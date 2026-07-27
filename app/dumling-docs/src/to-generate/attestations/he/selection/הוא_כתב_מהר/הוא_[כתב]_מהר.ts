import type { AttestedSelection, Selection } from "dumling/types";

const katavVerbSelection = {
	language: "he",
	spelledSelection: "כתב",

	surface: {
		language: "he",
		normalizedFullSurface: "כתב",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
		},
		lemma: {
			language: "he",
			canonicalLemma: "כתב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "PAAL",
			},
			meaningInEmojis: "✍️",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: katavVerbSelection,
	sentenceMarkdown: "הוא [כתב] מהר.",
	classifierNotes:
		"כתב is the verb inflection here, distinct from both the root morpheme and noun-like uses.",
} as const satisfies AttestedSelection;
