import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "tot",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "tot",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "tot",
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
		"Er wog vielleicht ein halbes Lot –\nund war am fünften Tage [tot].\n",
	classifierNotes:
		"Predicative tot is stored as a citation-shaped adjective because there is no overt inflection on the selected form.",
	isVerified: true,
} as const;
