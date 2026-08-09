import type { Attestation } from "dumling/types";

const occurrenceAttestation = {
	members: [
		{
			attested: "definately",
			orthography: "Typo",
		},
	],
	realizationCoverage: "Full",
	surface: {
		language: "en",
		normalizedSurface: "definitely",
		spelling: "Canonical",
		surfaceKind: "Citation",
		lemma: {
			language: "en",
			canonicalForm: "definitely",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
				pronType: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Attestation<"en", "Citation", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "I [definately] saved the file.",
	classifierNotes:
		'Definately is a typo of definitely; mark only `member.orthography: "Typo"` here, not a spelling variant, because the intended resolved surface is canonical.',
} as const;
