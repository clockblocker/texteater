import type { Lemma } from "dumling/types";

export const bookLemma = {
	language: "en",
	canonicalLemma: "book",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	inherentFeatures: {},
	meaningInEmojis: "📚",
} satisfies Lemma<"en", "Lexeme", "NOUN">;

export const attestation = {
	lemma: bookLemma,
	order: 38,
} as const;
