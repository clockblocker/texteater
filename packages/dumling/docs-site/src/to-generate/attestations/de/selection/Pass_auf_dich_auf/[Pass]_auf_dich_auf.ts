import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "Pass",

	surface: {
		language: "de",
		normalizedFullSurface: "pass auf",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			mood: "Imp",
			number: "Sing",
			person: "2",
			verbForm: "Fin",
		},
		lemma: {
			language: "de",
			canonicalLemma: "aufpassen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasGovPrep: "auf",
				hasSepPrefix: "auf",
			},
			meaningInEmojis: "👀",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: "[Pass] auf dich auf!",
	classifierNotes:
		'The finite verb token stays on the verbal surface `pass auf`; government is encoded on the lemma with `hasGovPrep: "auf"`, not by building a separate governed-preposition surface.',
	isVerified: true,
} as const satisfies AttestedSelection;
