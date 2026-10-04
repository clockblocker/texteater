import type * as Dumling from "dumling/types";

export const hebrewKatavLemma = {
	unitKind: "Lemma" as const,
	canonicalForm: "כתב",
	coreFeatures: {
		hebBinyan: "PAAL",
		hebExistential: null,
	},
	language: "he",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"he", "Lexeme", "VERB">;

export const hebrewKatavReading = {
	unitKind: "Reading" as const,
	lemma: hebrewKatavLemma,
	emojiDescription: "✍",
} satisfies Dumling.Reading<"he">;
