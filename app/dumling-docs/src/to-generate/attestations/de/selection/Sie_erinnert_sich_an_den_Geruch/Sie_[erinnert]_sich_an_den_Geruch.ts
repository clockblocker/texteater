import type { AttestedSelection, Selection } from "dumling/types";

const deSelection020 = {
	language: "de",
	spelledSelection: "erinnert",

	surface: {
		language: "de",
		normalizedFullSurface: "erinnert",
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
			canonicalLemma: "sich erinnern",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				lexicallyReflexive: "Yes",
				hasGovPrep: "an",
			},
			meaningInEmojis: "🧠",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection020,
	sentenceMarkdown: "Sie [erinnert] sich an den Geruch.",
	classifierNotes:
		"The lemma is lexically reflexive, but the selected token excludes sich; reflexivity stays inherent on the lemma.",
	isVerified: true,
} as const satisfies AttestedSelection;
