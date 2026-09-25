import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Das",
			orthography: "Standard",
		},
		{
			attested: "Band",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "Definite",
			case: "Nom",
			number: "Sing",
		},
		language: "de",
		normalizedSurface: "Band",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Band",
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
	sentenceMarkdown: "Das rote [Band] lag auf dem Geschenk.",
	classifierNotes:
		"The ribbon or tape use resolves to the neuter Band Lemma; the feminine music-group and masculine book-volume uses resolve to different Lemmas through their Core Features.",
	isVerified: true,
} as const;
