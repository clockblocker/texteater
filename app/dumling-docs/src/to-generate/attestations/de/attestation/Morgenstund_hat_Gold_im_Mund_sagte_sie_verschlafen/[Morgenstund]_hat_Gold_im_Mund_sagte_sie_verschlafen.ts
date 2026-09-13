import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Morgenstund",
			orthography: "Standard",
		},
		{
			attested: "hat",
			orthography: "Standard",
		},
		{
			attested: "Gold",
			orthography: "Standard",
		},
		{
			attested: "im",
			orthography: "Standard",
		},
		{
			attested: "Mund",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "morgenstund hat gold im mund",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Morgenstund hat Gold im Mund",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Phraseme", "Proverb">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Morgenstund] hat Gold im Mund, sagte sie verschlafen.",
	classifierNotes:
		"The Full Attestation records every member of the proverb occurrence; the docs review span remains on Morgenstund only.",
	isVerified: true,
} as const;
