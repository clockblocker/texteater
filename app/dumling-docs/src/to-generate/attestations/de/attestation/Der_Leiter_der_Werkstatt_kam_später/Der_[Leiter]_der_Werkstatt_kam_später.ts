import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Der",
			orthography: "Standard",
		},
		{
			attested: "Leiter",
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
		normalizedSurface: "Leiter",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Leiter",
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
	sentenceMarkdown: "Der [Leiter] der Werkstatt kam später.",
	classifierNotes:
		"The person-role use resolves to the masculine Leiter Lemma, distinct through its Core Features from the feminine ladder Lemma.",
	isVerified: true,
} as const;
