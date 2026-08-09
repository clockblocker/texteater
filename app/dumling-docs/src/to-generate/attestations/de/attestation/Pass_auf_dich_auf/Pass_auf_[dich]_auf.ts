import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "dich",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "dich",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
			reflex: "Yes",
			gender: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "du",
			family: "Lexeme",
			kind: "PRON",
			coreFeatures: {
				person: "2",
				pronType: "Prs",
				extPos: null,
				foreign: null,
				polite: null,
				poss: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "PRON">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Pass auf [dich] auf!",
	classifierNotes:
		"Dich is the accusative second-person pronoun `du`, with reflexive use marked on the inflected surface; it is not part of `normalizedSurface`, which remains the verbal surface `pass auf` for the split verb tokens.",
	isVerified: true,
} as const;
