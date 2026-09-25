import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "der",
			orthography: "Standard",
		},
		{
			attested: "Struwwelpeter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
		language: "de",
		normalizedSurface: "Struwwelpeter",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Struwwelpeter",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Masc",
				abbr: null,
				article: "Definite",
				foreign: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Sieh einmal, hier steht er, \npfui, der [Struwwelpeter]!",
	classifierNotes:
		"Struwwelpeter is a name canonically cited with its article (der Struwwelpeter), so it is a PROPN with Core article Definite and owns der as its first member, like a common noun owns its article.",
	isVerified: true,
} as const;
