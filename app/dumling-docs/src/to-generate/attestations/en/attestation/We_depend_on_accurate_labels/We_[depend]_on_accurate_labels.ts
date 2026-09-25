import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "depend",
			orthography: "Standard",
		},
		{
			attested: "on",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "en",
		normalizedSurface: "depend",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "en",
			canonicalForm: "depend",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				phrasal: null,
				style: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"en", "Lexeme", "VERB">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "We [depend] on accurate labels.",
	classifierNotes:
		"The Lemma is depend, not a phrasal depend on: on is a preposition the verb governs, not a particle. Government is valency, not identity (ADR 0029), so on stays out of the Lemma and its Canonical Form; it is government recorded per ADR 0034, in the Reading's Valency Frame. On stays an Attestation member, so clicking it opens depend. English has no complement vocabulary yet, so the Attestation records no valencyEvidence entry for on.",
} as const;
