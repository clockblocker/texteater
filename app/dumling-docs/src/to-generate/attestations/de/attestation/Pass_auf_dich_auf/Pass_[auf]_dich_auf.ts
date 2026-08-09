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
	sentenceMarkdown: "Pass [auf] dich auf!",
	classifierNotes:
		"The governed preposition is a standalone `auf` Surface. It is not a member of the separable verb occurrence `Pass … auf`; future valency may relate it to `aufpassen`.",
	isVerified: true,
} as const;
