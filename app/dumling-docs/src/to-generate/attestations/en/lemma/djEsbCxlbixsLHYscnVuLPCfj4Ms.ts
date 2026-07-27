import type { Lemma } from "dumling/types";

export const runLemma = {
	language: "en",
	canonicalLemma: "run",
	lemmaKind: "Lexeme",
	lemmaSubKind: "VERB",
	inherentFeatures: {},
	meaningInEmojis: "🏃",
} satisfies Lemma<"en", "Lexeme", "VERB">;

export const attestation = {
	lemma: runLemma,
	order: 37,
} as const;
