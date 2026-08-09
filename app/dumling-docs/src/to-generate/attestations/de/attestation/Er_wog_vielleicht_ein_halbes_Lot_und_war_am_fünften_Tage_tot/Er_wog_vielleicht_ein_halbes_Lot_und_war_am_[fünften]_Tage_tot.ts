import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "fünften",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "fünften",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			case: "Dat",
			degree: "Pos",
			gender: "Masc",
			number: "Sing",
		},
		lemma: {
			language: "de",
			canonicalForm: "fünfte",
			family: "Lexeme",
			kind: "ADJ",
			coreFeatures: {
				numType: "Ord",
				abbr: null,
				foreign: null,
				variant: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"de", "Inflection", "Lexeme", "ADJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Er wog vielleicht ein halbes Lot –\nund war am [fünften] Tage tot.\n",
	classifierNotes:
		"Fünften is the dative masculine singular inflected form of the ordinal adjective fünfte in the temporal phrase am fünften Tage, so I modeled it as ADJ with ordinal number features rather than as a cardinal numeral.",
	isVerified: true,
} as const;
