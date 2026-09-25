import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ל",
			orthography: "Fused",
			fusion: {
				spelling: "לעבודה",
				components: [
					{ span: "ל", surface: "ל" },
					{ span: "", surface: "ה" },
					{ span: "עבודה", surface: "עבודה" },
				],
			},
			component: 0,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ל",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ל",
			family: "Lexeme",
			kind: "ADP",
			coreFeatures: {
				abbr: null,
				case: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "יצאתי [ל]עבודה מוקדם.",
	classifierNotes:
		"ל is the ADP to, its own Lexeme and the Fused first piece of לעבודה (la-avoda). The Fusion lists the hidden article ה, which belongs to the noun עבודה.",
} as const;
