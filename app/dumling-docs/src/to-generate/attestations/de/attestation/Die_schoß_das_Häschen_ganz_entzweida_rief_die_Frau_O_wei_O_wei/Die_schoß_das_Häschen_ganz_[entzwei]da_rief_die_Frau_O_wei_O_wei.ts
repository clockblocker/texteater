import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "entzwei",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "entzwei",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "entzwei",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die schoß das Häschen ganz [entzwei];\nda rief die Frau: »O wei! O wei!«",
	classifierNotes:
		"I treated entzwei as a lexical adjective, following dictionary treatment, even though in this resultative use it feels adverb-like on the surface. Because there is no overt inflection here, the surface is stored as a citation-shaped ADJ rather than as an inflected form.",
	isVerified: true,
} as const;
