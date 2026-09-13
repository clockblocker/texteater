import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "them",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "them",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Acc",
			number: "Plur",
			gender: null,
			reflex: null,
		},
		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I emailed [them] yesterday.",
	classifierNotes:
		"Them is an accusative surface of they; singular-they readings are not separately encoded.",
} as const;
