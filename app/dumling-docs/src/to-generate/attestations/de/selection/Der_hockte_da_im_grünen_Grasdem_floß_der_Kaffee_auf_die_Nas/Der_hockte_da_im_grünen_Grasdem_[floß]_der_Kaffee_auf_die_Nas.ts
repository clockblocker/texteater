import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "floß",

	surface: {
		language: "de",
		normalizedFullSurface: "floß",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Ind",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "fließen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🌊",
		},
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
