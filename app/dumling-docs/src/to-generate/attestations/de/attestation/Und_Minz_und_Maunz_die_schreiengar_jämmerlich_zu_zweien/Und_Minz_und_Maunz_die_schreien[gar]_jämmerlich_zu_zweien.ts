import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "gar",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "gar",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "gar",
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
		"Und Minz und Maunz, die schreien\n[gar] jämmerlich zu zweien",
	classifierNotes:
		"Gar functions as an intensifier here. Dumling does not currently split German focus or degree particles into a separate subtype, so I classified it as ADV rather than PART.",
	isVerified: true,
} as const;
