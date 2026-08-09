import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "wupp",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "wupp",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"de", "Citation", "Lexeme", "INTJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Fort geht nun die Mutter und\n[wupp]! den Daumen in den Mund.\n",
	classifierNotes:
		"Wupp looks like an exclamatory sound-effect item, so I treated it as a plain interjection. I did not model it as a discourse formula because there is no larger fixed phrase to recover, and I did not force `partType: Res` because this is an expressive exclamation rather than a response particle.",
	isVerified: true,
} as const;
