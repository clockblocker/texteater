import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "Sie",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "2",
		polite: "Form",
		poss: null,
		pronType: "Prs",
		referenceNumber: null,
		case: "Nom",
		number: "Plur",
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👈" }, lemma },
	knowledge: {
		definition:
			"Die Personalpronomenform „Sie“ verweist auf eine oder mehrere höflich angesprochene Personen.",
		transcription: "ziː",
		translations: {
			en: ["you (formal singular)"],
			ru: ["Вы (вежл., ед. ч.)"],
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
