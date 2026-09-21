import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "nimmt",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	expletiveEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "nimmt",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "in acht nehmen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "Idiom">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\nund [nimmt] sie sorglich sehr in acht.",
	classifierNotes:
		"The Full Attestation preserves the complete normalized Surface nimmt, which resolves to the fixed-expression Lemma in acht nehmen rather than a standalone nehmen inflection.",
	isVerified: true,
} as const;
