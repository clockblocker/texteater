import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "war",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "war",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "sein",
			family: "Lexeme",
			kind: "AUX",
			coreFeatures: {
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Er wog vielleicht ein halbes Lot –\nund [war] am fünften Tage tot.\n",
	classifierNotes:
		"I kept war under the AUX Lemma sein, following the repo's treatment of finite and participial sein forms as auxiliary/copular rather than splitting off a separate lexical VERB Lemma.",
	isVerified: true,
} as const;
