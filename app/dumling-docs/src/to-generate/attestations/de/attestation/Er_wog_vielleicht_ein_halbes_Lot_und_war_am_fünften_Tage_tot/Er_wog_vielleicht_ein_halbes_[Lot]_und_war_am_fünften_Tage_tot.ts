import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Lot",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "Lot",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Lot",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Er wog vielleicht ein halbes [Lot] –\nund war am fünften Tage tot.\n",
	classifierNotes:
		"I treated Lot as the neuter weight unit and annotated the noun as accusative singular because it is the measure complement of wog. The bare noun form itself is syncretic with the citation form, so the case decision comes from the clause, not from overt noun morphology.",
	isVerified: true,
} as const;
