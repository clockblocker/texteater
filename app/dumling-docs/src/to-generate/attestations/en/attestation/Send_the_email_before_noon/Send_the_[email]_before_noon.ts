import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "the",
			orthography: "Standard",
		},
		{
			attested: "e-mail",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "Definite",
			number: "Sing",
		},
		language: "en",
		normalizedSurface: "e-mail",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "email",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Send the [e-mail] before noon.",
	classifierNotes:
		"Hyphenated e-mail is a standard variant of email, not a typo.",
} as const;
