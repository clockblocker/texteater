import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "auf",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "de",
		normalizedSurface: "auf",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
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
} satisfies Attestation<"de", "Citation", "Lexeme", "ADP">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"Der hockte da im grünen Gras;\ndem floß der Kaffee [auf] die Nas.",
	classifierNotes:
		"`auf` heads the directional phrase `auf die Nas`, so I treated it as an ordinary preposition, not as a verbal particle. I left `governedCase` unset even though this local phrase is accusative, because the Lemma `auf` is a two-way preposition and the Dumling schema stores that feature lexically rather than per attested token.",
	isVerified: true,
} as const;
