import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "auf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "auf",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "auf",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				adpType: "Prep",
				abbr: null,
				extPos: null,
				foreign: null,
				governedCase: null,
				partType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Das rote Band lag [auf] dem Geschenk.",
	classifierNotes:
		"`auf` heads the ordinary locative prepositional phrase `auf dem Geschenk`, so it is a plain preposition, not part of the verb `liegen`. I left `governedCase` unset because `auf` is a two-way preposition and the schema stores that feature lexically rather than per attested token, even though this local phrase is dative.",
	isVerified: true,
} as const;
