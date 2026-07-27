import type { AttestedSelection, Selection } from "dumling/types";

const deSelection = {
	language: "de",
	spelledSelection: "jämmerlich",

	surface: {
		language: "de",
		normalizedFullSurface: "jämmerlich",
		surfaceKind: "Citation",
		lemma: {
			language: "de",
			canonicalLemma: "jämmerlich",
			lemmaKind: "Lexeme",
			lemmaSubKind: "ADV",
			inherentFeatures: {},
			meaningInEmojis: "😭",
		},
	},
} satisfies Selection<"de", "Citation", "Lexeme", "ADV">;

export const attestation = {
	selection: deSelection,
	sentenceMarkdown: `Und Minz und Maunz, die schreien
gar [jämmerlich] zu zweien`,
	classifierNotes:
		"Jämmerlich is adjective-shaped, but in this sentence it modifies schreien adverbially. I classified the attested use as ADV to reflect the learner-facing role in context.",
	isVerified: true,
} as const satisfies AttestedSelection;
