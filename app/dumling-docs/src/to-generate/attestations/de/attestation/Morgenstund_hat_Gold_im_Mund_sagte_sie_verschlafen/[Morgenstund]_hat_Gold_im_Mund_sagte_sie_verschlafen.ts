import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
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
		language: "de",
		normalizedSurface: "morgenstund hat gold im mund",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "Morgenstund hat Gold im Mund",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Phraseme", "Proverb">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[Morgenstund] hat Gold im Mund, sagte sie verschlafen.",
	classifierNotes:
		"The Full Attestation records every member of the proverb occurrence; the docs review span remains on Morgenstund only.",
	isVerified: true,
} as const;
