import type { AttestedSelection, Selection } from "dumling/types";

const deSelection054 = {
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
			lemmaSubKind: "AUX",
			inherentFeatures: {
				verbType: "Mod",
			},
			meaningInEmojis: "⚠️",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	selection: deSelection054,
	sentenceMarkdown: "Er [muss] heute arbeiten.",
	classifierNotes:
		"Muss is AUX here because it combines with the overt infinitive arbeiten rather than standing alone as the clause's main predicate.",
	isVerified: true,
} as const satisfies AttestedSelection;
