import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "jämmerlich",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "jämmerlich",
		spelling: "Canonical",

		inflectionalFeatures: {
			case: null,
			degree: "Pos",
			number: null,
			gender: null,
		},
		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "jämmerlich",
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
	sentenceMarkdown:
		"Und Minz und Maunz, die schreien\ngar [jämmerlich] zu zweien",
	classifierNotes:
		"Jämmerlich modifies schreien adverbially, but an adverbially used plain adjective stays ADJ (ADR 0033), with positive degree and no agreement.",
	isVerified: true,
} as const;
