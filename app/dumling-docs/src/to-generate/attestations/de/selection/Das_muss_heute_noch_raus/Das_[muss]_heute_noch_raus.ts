import type { AttestedSelection, Selection } from "dumling/types";

const deSelection024 = {
	language: "de",
	spelledSelection: "muss",

	surface: {
		language: "de",
		normalizedFullSurface: "muss",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Pres",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "müssen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				verbType: "Mod",
			},
			meaningInEmojis: "⚠️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection024,
	sentenceMarkdown: "Das [muss] heute noch raus.",
	classifierNotes:
		"Muss is treated as a lexical modal VERB with verbType Mod here, because it is the clause's main predicate and there is no overt infinitive for it to auxiliary-mark.",
	classificationMistakes:
		"Do not default finite müssen to AUX just because it is modal. In this attestation the earlier mistake was classifying muss as lemmaSubKind AUX even though the clause is elliptical and the selected word functions as the main predicate rather than as an auxiliary to an overt infinitive.",
	isVerified: true,
} as const satisfies AttestedSelection;
