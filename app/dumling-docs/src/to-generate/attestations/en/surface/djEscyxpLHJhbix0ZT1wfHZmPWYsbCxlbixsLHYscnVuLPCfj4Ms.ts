import type { Surface } from "dumling/types";

export const ranSurface = {
	language: "en",
	normalizedFullSurface: "ran",
	surfaceKind: "Inflection",
	inflectionalFeatures: {
		tense: "Past",
		verbForm: "Fin",
	},
	lemma: {
		language: "en",
		canonicalLemma: "run",
		lemmaKind: "Lexeme",
		lemmaSubKind: "VERB",
		inherentFeatures: {},
		meaningInEmojis: "🏃",
	},
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	order: 39,
	sentenceMarkdown: "Yesterday, I **ran** to the station.",
	surface: ranSurface,
} as const;
