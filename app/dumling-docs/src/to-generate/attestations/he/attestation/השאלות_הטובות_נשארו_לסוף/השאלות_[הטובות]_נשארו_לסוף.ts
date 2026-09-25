import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ה",
			orthography: "Fused",
			fusion: {
				spelling: "הטובות",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "טובות", surface: "טובות" },
				],
			},
			component: 0,
		},
		{
			attested: "טובות",
			orthography: "Fused",
			fusion: {
				spelling: "הטובות",
				components: [
					{ span: "ה", surface: "ה" },
					{ span: "טובות", surface: "טובות" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "טובות",
		spelling: "Canonical",

		inflectionalFeatures: {
			definite: "Def",
			gender: "Fem",
			number: "Plur",
		},
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "טוב",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "השאלות [הטובות] נשארו לסוף.",
	classifierNotes:
		"הטובות is a definite feminine plural adjective agreeing with השאלות. The adjective owns its own article ה as a Fused member; normalizedSurface is טובות.",
} as const;
