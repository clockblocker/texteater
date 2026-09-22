import type * as Dumling from "dumling/types";

export const ranSurface = {
	unitKind: "Surface",
	language: "en",
	normalizedSurface: "ran",
	spelling: "Canonical",

	inflectionalFeatures: {
		mood: null,
		number: "Sing",
		person: "1",
		tense: "Past",
		verbForm: "Fin",
		voice: null,
	},
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "en",
		canonicalForm: "run",
		family: "Lexeme",
		kind: "VERB",
		coreFeatures: {
			abbr: null,
			extPos: null,
			phrasal: null,
			style: null,
		},
	},
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

export const attestation = {
	order: 39,
	sentenceMarkdown: "Yesterday, I **ran** to the station.",
	surface: ranSurface,
} as const;
