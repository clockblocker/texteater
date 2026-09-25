import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "die",
	coreFeatures: {
		case: "Nom",
		definite: "Def",
		extPos: null,
		foreign: null,
		gender: null,
		number: "Plur",
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Art",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👉" }, lemma },
	knowledge: {
		transcription: "diː",
		definition:
			"Der bestimmte Artikel „die“ kennzeichnet einen bestimmten Bezug. Form: Nominativ, Plural.",
		translations: { en: ["the"], ru: ["определённый артикль"] },
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
