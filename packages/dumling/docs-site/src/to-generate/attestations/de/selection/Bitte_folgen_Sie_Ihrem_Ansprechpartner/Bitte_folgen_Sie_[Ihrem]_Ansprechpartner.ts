import type { AttestedSelection, Selection } from "dumling/types";

const deSelection033 = {
	language: "de",
	spelledSelection: "Ihrem",

	surface: {
		language: "de",
		normalizedFullSurface: "Ihrem",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalLemma: "Ihr",
			lemmaKind: "Lexeme",
			lemmaSubKind: "DET",
			inherentFeatures: {
				person: "2",
				polite: "Form",
				poss: "Yes",
				pronType: "Prs",
			},
			meaningInEmojis: "🤝",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "DET">;

export const attestation = {
	selection: deSelection033,
	sentenceMarkdown: "Bitte folgen Sie [Ihrem] Ansprechpartner.",
	classifierNotes:
		"The capitalized polite possessive is encoded as DET with person 2, polite Form, and poss Yes.",
	classificationMistakes:
		"Do not add gender[psor] or number[psor] unless the attested form or context actually disambiguates them. For polite Ihrem here, the earlier mistake was adding possessor features that are not recoverable from the attestation.",
	isVerified: true,
} as const satisfies AttestedSelection;
