import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "raus",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "raus",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "heraus",
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
	sentenceMarkdown: "Das muss heute noch [raus].",
	classifierNotes:
		"Raus is treated as the directional adverb with canonical lemma heraus. I did not fold it into a separable-verb analysis here, because the clause is elliptical and there is no overt finite verb like geht or muss-embedded infinitive host for a particle split.",
	isVerified: true,
} as const;
