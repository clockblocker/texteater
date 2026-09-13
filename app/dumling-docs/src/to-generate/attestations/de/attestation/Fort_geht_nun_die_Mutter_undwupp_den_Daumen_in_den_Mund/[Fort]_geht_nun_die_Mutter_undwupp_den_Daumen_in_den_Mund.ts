import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Fort",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: null,
		language: "de",
		normalizedSurface: "fort",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "fort",
			family: "Lexeme",
			kind: "ADV",
			coreFeatures: {
				foreign: null,
				numType: null,
				pronType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "ADV">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown:
		"[Fort] geht nun die Mutter und\nwupp! den Daumen in den Mund.\n",
	classificationMistakes:
		"I previously over-read `Fort` as a partial attestation of the separable verb `fortgehen`. Under the stricter directional-item rule, this line is better kept as plain `gehen` plus the standalone directional adverb `fort`, because the form itself does not force the lexicalized verb analysis.",
	classifierNotes:
		"Fort is treated as the standalone directional adverb here. Even with the overt motion verb `geht`, the fronted `Fort geht ...` sequence does not by itself force the lexicalized separable verb `fortgehen`, so dumling keeps the compositional `gehen` + directional-adverb analysis.",
	isVerified: true,
} as const;
