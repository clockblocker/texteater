import type {
	AttestedSelection,
	SegmentedSentenceId,
	Selection,
} from "dumling/types";

const deSelection = {
	segmentedSentenceId: "sentence_gSC4wQneltmlijMNKZ" as SegmentedSentenceId,
	clickedSegmentIndex: 15,
	surfaceSegmentIndices: [15],
	attestedSurface: "floß",
	selectedOrthography: "Standard",

	surface: {
		language: "de",
		normalizedSurface: "floß",
		spelling: "Canonical",
		realizationCoverage: "Full",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		},
		lemma: {
			language: "de",
			canonicalForm: "fließen",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
		surfaceFeatures: null,
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Der hockte da im grünen Gras;
dem [floß] der Kaffee auf die Nas.`,
	classifierNotes:
		"I read `floß` as the 3sg past finite of `fließen`: `dem floß der Kaffee auf die Nas` means the coffee ran onto his nose. I considered the noun `Floß` for a second because the isolated form is ambiguous, but the clause structure with dative experiencer `dem` and subject `der Kaffee` makes the verbal reading clearly better.",
	isVerified: true,
} as const satisfies AttestedSelection;
