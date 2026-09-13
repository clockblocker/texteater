import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "eingezeichneten",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "eingezeichneten",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Nom",
			degree: "Pos",
			number: "Plur",
			gender: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "eingezeichnet",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				abbr: null,
				foreign: null,
				numType: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Die [eingezeichneten] Seen sind jetzt besser zu sehen.",
	classifierNotes:
		"Eingezeichneten is annotated as an attributive adjective inflection here. Unlike bare predicative eingezeichnet, which this repo keeps under the verb einzeichnen, the noun-modifying participial form in die eingezeichneten Seen goes to ADJ.",
	isVerified: true,
} as const;
