import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "them",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "them",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
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
	sentenceMarkdown: "I emailed [them] yesterday.",
	classifierNotes:
		"Them is an accusative surface of they; singular-they readings are not separately encoded.",
} as const;
