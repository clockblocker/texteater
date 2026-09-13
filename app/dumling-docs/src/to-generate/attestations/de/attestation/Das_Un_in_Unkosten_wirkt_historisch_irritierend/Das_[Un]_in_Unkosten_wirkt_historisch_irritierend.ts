import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Un",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Un",
		spelling: "Variant",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "un-",
			family: "Morpheme",
			kind: "Prefix",
			coreFeatures: {
				hasSepPrefix: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Morpheme", "Prefix">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das [Un]- in Unkosten wirkt historisch irritierend.",
	classifierNotes:
		"The bound prefix is represented with the canonical hyphenated lemma un-, while the selected spelling excludes the hyphen.",
	isVerified: true,
} as const;
