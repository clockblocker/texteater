import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "die",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "die",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				pronType: "Rel",
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Und Minz und Maunz, [die] schreien\ngar jämmerlich zu zweien",
	classifierNotes:
		"Die links the relative clause back to Minz und Maunz, so this is the nominative plural relative pronoun, not the article.",
	isVerified: true,
} as const;
