import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
		language: "en",
		normalizedSurface: "look up",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"en", "Citation", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Please [look] it up before replying.",
	classifierNotes:
		"The Full Attestation records both source-ordered members of the discontinuous phrasal verb look ... up; the docs review span remains on look only.",
} as const;
