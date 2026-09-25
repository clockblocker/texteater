import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "ו",
			orthography: "Fused",
			fusion: {
				spelling: "ודנה",
				components: [
					{ span: "ו", surface: "ו" },
					{ span: "דנה", surface: "דנה" },
				],
			},
			component: 0,
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "he",
		normalizedSurface: "ו",
		spelling: "Canonical",
		lemma: {
			unitKind: "Lemma",
			language: "he",
			canonicalForm: "ו",
			family: "Lexeme",
			kind: "CCONJ",
			coreFeatures: {},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"he", "Lexeme", "CCONJ">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "[ו]דנה כבר חיכתה בחוץ.",
	classifierNotes:
		"ו is the CCONJ and, its own Lexeme. It is written fused to דנה, so its member is the Fused first piece of ודנה.",
} as const;
