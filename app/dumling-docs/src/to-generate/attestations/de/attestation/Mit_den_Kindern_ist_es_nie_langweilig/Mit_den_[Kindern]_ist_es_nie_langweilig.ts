import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "Kindern",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "Kindern",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			number: "Plur",
		},
		lemma: {
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
} satisfies Attestation<"de", "Inflection", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Mit den [Kindern] ist es nie langweilig.",
	classifierNotes:
		"Kindern is a dative plural noun with plural -n; the surface features carry both case and number.",
	isVerified: true,
} as const;
