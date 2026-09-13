import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Kindern",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Kindern",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Dat",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Kind",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Mit den [Kindern] ist es nie langweilig.",
	classifierNotes:
		"Kindern is a dative plural noun with plural -n; the surface features carry both case and number.",
	isVerified: true,
} as const;
