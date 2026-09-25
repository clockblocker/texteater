import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "acommodation",
			orthography: "Typo",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "None",
			number: "Sing",
		},
		language: "en",
		normalizedSurface: "accommodation",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "accommodation",
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
	sentenceMarkdown: "The sign advertised [acommodation] nearby.",
	classifierNotes:
		"Acommodation is represented as Typo with normalized surface accommodation; no edit-distance metadata exists.",
} as const;
