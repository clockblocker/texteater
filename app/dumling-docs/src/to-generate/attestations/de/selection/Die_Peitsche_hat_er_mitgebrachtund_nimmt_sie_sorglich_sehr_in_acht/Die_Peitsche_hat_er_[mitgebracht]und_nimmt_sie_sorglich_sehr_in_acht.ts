import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "mitgebracht",

	surface: {
		language: "de",
		normalizedFullSurface: "mitgebracht",
		surfaceKind: "Inflection",
		inflectionalFeatures: {
			aspect: "Perf",
			verbForm: "Part",
		},
		lemma: {
			language: "de",
			canonicalLemma: "mitbringen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hasSepPrefix: "mit",
			},
			meaningInEmojis: "📦",
		},
	},
} satisfies Selection<"de", "Inflection", "Lexeme", "VERB">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Die Peitsche hat er [mitgebracht]
und nimmt sie sorglich sehr in acht.`,
	classifierNotes:
		"Mitgebracht is the perfect participle of separable mitbringen; the prefix stays on the lemma as hasSepPrefix rather than being split off in this file.",
	isVerified: true,
} as const satisfies AttestedSelection;
