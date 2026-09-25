import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Berlin",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: null,
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
		},
		language: "de",
		normalizedSurface: "Berlin",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Berlin",
			family: "Lexeme",
			kind: "PROPN",
			coreFeatures: {
				gender: "Neut",
				abbr: null,
				article: null,
				foreign: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "PROPN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Viele vermissen das alte [Berlin].",
	classifierNotes:
		"Berlin is cited bare, so its Lemma has no article and the das before it is not its member.",
	isVerified: true,
} as const;
