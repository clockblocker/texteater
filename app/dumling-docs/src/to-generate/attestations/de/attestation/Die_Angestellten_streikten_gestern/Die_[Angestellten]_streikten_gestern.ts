import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Die",
			orthography: "Standard",
		},
		{
			attested: "Angestellten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Angestellten",
		spelling: "Canonical",

		inflectionalFeatures: {
			article: "Definite",
			case: "Nom",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Angestellter",
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
	sentenceMarkdown: "Die [Angestellten] streikten gestern.",
	classifierNotes:
		"Angestellten is a substantivized participial form used here as a plural noun. Under the German rule for nominalized verb forms, it classifies as NOUN rather than ADJ or VERB; subject position and verb agreement support nominative plural.",
	isVerified: true,
} as const;
