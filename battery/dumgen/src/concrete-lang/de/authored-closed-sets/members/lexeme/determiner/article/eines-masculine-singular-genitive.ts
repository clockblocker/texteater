import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "eines",
	coreFeatures: {
		case: "Gen",
		definite: "Ind",
		extPos: null,
		foreign: null,
		gender: "Masc",
		number: "Sing",
		numType: "Card",
		person: null,
		polite: null,
		poss: null,
		pronType: "Art",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "1️⃣" }, lemma },
	knowledge: {
		transcription: "ˈaɪ̯nəs",
		definition:
			"Der unbestimmte Artikel „eines“ führt einen nicht näher bestimmten Bezug ein. Form: Genitiv, Singular, Maskulinum.",
		translations: { en: ["a", "an"], ru: ["неопределённый артикль"] },
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
