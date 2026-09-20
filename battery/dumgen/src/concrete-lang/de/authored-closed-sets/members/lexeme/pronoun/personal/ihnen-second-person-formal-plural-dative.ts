import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "Ihnen",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "2",
		polite: "Form",
		poss: null,
		pronType: "Prs",
		referenceNumber: null,
		case: "Dat",
		number: "Plur",
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👤" }, lemma },
	knowledge: {
		definition:
			"Die Personalpronomenform „Ihnen“ verweist auf eine oder mehrere höflich angesprochene Personen.",
		transcription: "ˈiːnən",
		translations: {
			en: ["you (formal singular)"],
			ru: ["Вам (вежл., ед. ч.)"],
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
