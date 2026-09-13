import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "da",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "da",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "da",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Jetzt schien die Sonne gar zu sehr,\n[da] ward ihm sein Gewehr zu schwer.",
	classifierNotes:
		"I treated `da` as a narrative temporal adverb meaning roughly `then`, not as the subordinating conjunction, because the clause stays V2 (`da ward ...`) instead of showing subordinate verb-final order.",
	isVerified: true,
} as const;
