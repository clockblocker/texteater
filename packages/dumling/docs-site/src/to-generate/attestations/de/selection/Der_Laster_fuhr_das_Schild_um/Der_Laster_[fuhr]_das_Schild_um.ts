import type { AttestedSelection, Selection } from "dumling/types";

const deSelection017 = {
	language: "de",
	selectionFeatures: { coverage: "Partial" },
	spelledSelection: "fuhr",

	surface: {
		language: "de",
		normalizedFullSurface: "fuhr um",
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
			canonicalLemma: "umfahren",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasSepPrefix: "um",
			},
			meaningInEmojis: "💥",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection017,
	sentenceMarkdown: "Der Laster [fuhr] das Schild um.",
	classifierNotes:
		"This is discontinuous separable umfahren compressed into the full surface fuhr um; the selected spelling is only the finite verb token.",
	isVerified: true,
} as const satisfies AttestedSelection;
