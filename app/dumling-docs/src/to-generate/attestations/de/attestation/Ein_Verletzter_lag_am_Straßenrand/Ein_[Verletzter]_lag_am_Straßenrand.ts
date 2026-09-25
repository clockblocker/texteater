import type * as Dumling from "dumling/types";

const occurrenceAttestation = {
	unitKind: "Attestation",
	members: [
		{
			attested: "Ein",
			orthography: "Standard",
		},
		{
			attested: "Verletzter",
			orthography: "Standard",
		},
	],
	realizationCoverage: "Full",
	articleEvidence: { kind: "Owned", member: 0 },
	valencyEvidence: [],
	surface: {
		unitKind: "Surface",
		inflectionalFeatures: {
			article: "Indefinite",
			case: "Nom",
			number: "Sing",
		},
		language: "de",
		normalizedSurface: "Verletzter",
		spelling: "Canonical",

		lemma: {
			unitKind: "Lemma",
			language: "de",
			canonicalForm: "Verletzter",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Masc",
				hyph: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Dumling.Attestation<"de", "Lexeme", "NOUN">;

export const attestation = {
	attestation: occurrenceAttestation,
	sentenceMarkdown: "Ein [Verletzter] lag am Straßenrand.",
	classifierNotes:
		"Verletzter is a substantivized participial form used as a noun here. The highlighted form is already citation-shaped for this nominal reading, so it stays `Surface/Citation` and is classified as `NOUN` rather than `ADJ` or `VERB`.",
	isVerified: true,
} as const;
