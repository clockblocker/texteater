import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "ward",

	surface: {
		language: "de",
		normalizedFullSurface: "ward",
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
			canonicalLemma: "werden",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🔄",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Jetzt schien die Sonne gar zu sehr,
da [ward] ihm sein Gewehr zu schwer.`,
	classifierNotes:
		"I treated `ward` as the archaic 3sg past finite of `werden` and analyzed it as `VERB` because it carries the clause's change-of-state meaning with the predicative complement `zu schwer`, rather than auxiliary-marking another verbal form. We may eventually want an `isArch` flag on `Selection` for forms like `ward`, but for now this attestation stays otherwise unchanged.",
	classificationMistakes:
		"Do not default finite `werden` to `AUX` just because it takes a predicative complement. The earlier mistake here was classifying `ward` as `AUX` instead of lexical `VERB` in a change-of-state use.",
	isVerified: true,
} as const satisfies AttestedSelection;
