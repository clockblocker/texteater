import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "like",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "like",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "like",
			family: "Lexeme",
			kind: "SCONJ",
			coreFeatures: {
				style: "Vrnc",
				abbr: null,
				extPos: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "SCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Do it [like] I showed you.",
	classifierNotes:
		"Like as a subordinator is marked SCONJ with vernacular style because many registers prefer as.",
} as const;
