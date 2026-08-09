import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "walk",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "walk",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "walk",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "During my [walk] in a park, I saw a squirrel.",
} as const;
