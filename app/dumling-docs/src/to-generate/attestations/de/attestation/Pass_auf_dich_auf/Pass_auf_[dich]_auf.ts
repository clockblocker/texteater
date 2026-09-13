import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "dich",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "dich",
		spelling: "Canonical",
		inflectionalFeatures: {
			reflex: "Yes",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "dich",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "2",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
				referenceNumber: "Sing",
				case: "Acc",
				number: "Sing",
				gender: null,
				"gender[psor]": null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Pass auf [dich] auf!",
	classifierNotes:
		"Dich is a free contextual reflexive object, not an inherent member of aufpassen; its independent pronoun Attestation remains separate from the verbal Surface `pass auf auf`.",
	isVerified: true,
} as const;
