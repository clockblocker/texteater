import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Seen",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Seen",
		spelling: "Canonical",

		inflectionalFeatures: {
			article: null,
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "See",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Auf der Karte sind drei [Seen] eingezeichnet.",
	classifierNotes:
		"Plural noun with masculine lemma See; the capitalized surface is normalized by the encoder.",
	isVerified: true,
} as const;
