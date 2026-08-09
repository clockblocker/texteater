import type { Surface } from "dumling/types";

export const ranSurface = {
	language: "en",
	normalizedSurface: "ran",
	spelling: "Canonical",
	surfaceKind: "Inflection",
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
		language: "en",
		canonicalForm: "run",
		family: "Lexeme",
		kind: "VERB",
		coreFeatures: {
			abbr: null,
			extPos: null,
			hasGovPrep: null,
			phrasal: null,
			style: null,
		},
	},
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	order: 39,
	sentenceMarkdown: "Yesterday, I **ran** to the station.",
	surface: ranSurface,
} as const;
