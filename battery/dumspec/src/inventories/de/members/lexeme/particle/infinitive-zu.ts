import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

// Infinitive zu is a PART with partType Inf, a target apart from its
// infinitive, written apart or infixed (Rule de/bare-infinitive-zu). Without
// um, ohne or statt it has this one Reading; inside um … zu and its kin it is
// a member of the conjunction Locution. Degree zu is ADV and the preposition
// zu is ADP: other words (#734).
// https://www.duden.de/rechtschreibung/zu_mit_Infinitiv
const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PART",
	canonicalForm: "zu",
	coreFeatures: {
		abbr: null,
		partType: "Inf",
		polarity: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔗" }, lemma },
	knowledge: {
		transcription: "tsuː",
		definition:
			"Steht vor dem Infinitiv oder bei trennbaren Verben zwischen Präfix und Stamm und bildet den Infinitiv mit zu: Er versucht zu schlafen. Das ist schwer zu erklären. Sie hat vergessen anzurufen.",
		translations: {
			en: ["to (before an infinitive)"],
			ru: ["частица перед инфинитивом (не переводится)"],
		},
	},
	coverage: {
		transcription: "Authored",
		definition: "Authored",
		translations: { en: "Authored", ru: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "ReviewedEmpty",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
