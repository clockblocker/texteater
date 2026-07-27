import type { AttestedSelection, Selection } from "dumling/types";

const nichtavVerbSelection = {
	language: "he",
	spelledSelection: "נכתב",

	surface: {
		language: "he",
		normalizedFullSurface: "נכתב",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			gender: "Masc",
			number: "Sing",
			person: "3",
			tense: "Past",
			voice: "Pass",
		},
		lemma: {
			language: "he",
			canonicalLemma: "כתב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "NIFAL",
			},
			meaningInEmojis: "✍️",
		},
	},
} satisfies Selection<"he", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: nichtavVerbSelection,
	sentenceMarkdown: 'הדו"ח [נכתב] אתמול.',
	classifierNotes:
		"נכתב is the NIFAL passive-like form, so it carries voice Pass.",
} as const satisfies AttestedSelection;
