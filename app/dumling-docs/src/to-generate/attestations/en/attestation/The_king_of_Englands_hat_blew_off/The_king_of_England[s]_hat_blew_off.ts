import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "'s",
			orthography: "Fused",
			fusion: {
				spelling: "England's",
				components: [
					{ span: "England", surface: "England" },
					{ span: "'s", surface: "'s" },
				],
			},
			component: 1,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "'s",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "'s",
			family: "Lexeme",
			kind: "PART",
			coreFeatures: {
				abbr: null,
				extPos: null,
				polarity: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "PART">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "The king of England['s] hat blew off.",
	classifierNotes:
		"Possessive 's is its own PART Lemma, not noun inflection. It attaches to the whole phrase the king of England, so the possessor is the king even though 's is written on England.",
} as const;
