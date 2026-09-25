import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "walk",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "None",
			number: "Sing",
		},
		language: "en",
		normalizedSurface: "walk",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
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
} satisfies Dumling.Attestation<"en", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "During my [walk] in a park, I saw a squirrel.",
} as const;
