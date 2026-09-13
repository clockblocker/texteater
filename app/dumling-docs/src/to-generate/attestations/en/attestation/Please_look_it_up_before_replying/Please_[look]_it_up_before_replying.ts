import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "look",
			orthography: "Standard",
		},
		{
			attested: "up",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "en",
		normalizedSurface: "look up",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "look up",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				phrasal: "Yes",
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Please [look] it up before replying.",
	classifierNotes:
		"The Full Attestation records both source-ordered members of the discontinuous phrasal verb look ... up; the docs review span remains on look only.",
} as const;
