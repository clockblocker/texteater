import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "war",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "war",
		spelling: "Canonical",

		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			expletive: null,
			perfect: null,
			future: null,
			voice: null,
			passive: null,
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"de", "Lexeme", "AUX">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Er wog vielleicht ein halbes Lot –\nund [war] am fünften Tage tot.\n",
	classifierNotes:
		"I kept war under the AUX Lemma sein, following the repo's treatment of finite and participial sein forms as auxiliary/copular rather than splitting off a separate lexical VERB Lemma.",
	isVerified: true,
} as const;
