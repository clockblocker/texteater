import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "jämmerlich",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "jämmerlich",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalForm: "jämmerlich",
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
		"Und Minz und Maunz, die schreien\ngar [jämmerlich] zu zweien",
	classifierNotes:
		"Jämmerlich is adjective-shaped, but in this sentence it modifies schreien adverbially. I classified the attested use as ADV to reflect the learner-facing role in context.",
	isVerified: true,
} as const;
