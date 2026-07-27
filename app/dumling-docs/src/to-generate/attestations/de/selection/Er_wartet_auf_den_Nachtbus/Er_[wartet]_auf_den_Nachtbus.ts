import type { AttestedSelection, Selection } from "dumling/types";

const deSelection021 = {
	language: "de",
	spelledSelection: "wartet",

	surface: {
		language: "de",
		normalizedFullSurface: "wartet",
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
			canonicalLemma: "warten",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasGovPrep: "auf",
			},
			meaningInEmojis: "⏳",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection021,
	sentenceMarkdown: "Er [wartet] auf den Nachtbus.",
	classifierNotes:
		"The governed preposition auf is an inherent lemma feature, not part of the surface selection.",
	isVerified: true,
} as const satisfies AttestedSelection;
