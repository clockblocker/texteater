import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "dich",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "dich",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
			reflex: "Yes",
			gender: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "du",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "2",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Pass auf [dich] auf!",
	classifierNotes:
		"Dich is a free contextual reflexive object, not an inherent member of aufpassen; its independent pronoun Attestation remains separate from the verbal Surface `pass auf auf`.",
	isVerified: true,
} as const;
