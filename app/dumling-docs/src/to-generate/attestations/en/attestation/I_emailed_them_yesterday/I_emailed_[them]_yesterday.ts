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
		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "them",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "3",
				pronType: "Prs",
				abbr: null,
				extPos: null,
				poss: null,
				style: null,
				case: "Acc",
				gender: null,
				number: "Plur",
				reflex: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I emailed [them] yesterday.",
	classifierNotes:
		"Them is its own Lemma: English pronoun case and number are Core Features, so them is not a form of they. Singular-they readings are not separately encoded.",
} as const;
