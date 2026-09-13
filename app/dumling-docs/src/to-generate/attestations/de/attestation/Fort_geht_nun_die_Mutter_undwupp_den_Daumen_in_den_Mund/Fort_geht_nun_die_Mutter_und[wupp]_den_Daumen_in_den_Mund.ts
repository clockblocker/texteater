import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "wupp",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "wupp",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "wupp",
			family: "Lexeme",
			kind: "INTJ",
			coreFeatures: {
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Fort geht nun die Mutter und\n[wupp]! den Daumen in den Mund.\n",
	classifierNotes:
		"Wupp looks like an exclamatory sound-effect item, so I treated it as a plain interjection. I did not model it as a discourse formula because there is no larger fixed phrase to recover, and I did not force `partType: Res` because this is an expressive exclamation rather than a response particle.",
	isVerified: true,
} as const;
