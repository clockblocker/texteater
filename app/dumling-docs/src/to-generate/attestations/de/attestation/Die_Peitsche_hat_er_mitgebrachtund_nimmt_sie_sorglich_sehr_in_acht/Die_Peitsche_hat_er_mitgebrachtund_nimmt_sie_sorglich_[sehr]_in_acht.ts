import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "sehr",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "sehr",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "sehr",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Die Peitsche hat er mitgebracht\nund nimmt sie sorglich [sehr] in acht.",
	classifierNotes:
		"Sehr functions as an intensifying adverb here; dumling does not currently split German degree particles away from ADV.",
	isVerified: true,
} as const;
