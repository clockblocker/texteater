import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "They",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "they",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Nom",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			language: "en",
			canonicalForm: "they",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				abbr: null,
				extPos: null,
				poss: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[They] left their umbrella here.",
	classifierNotes:
		"They is marked plural because the current English PRON schema has number but no singular-they semantic flag.",
} as const;
