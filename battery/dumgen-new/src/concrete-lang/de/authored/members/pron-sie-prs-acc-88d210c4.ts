import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

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
		referenceNumber: "Sing",
		case: "Acc",
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
			"Die Personalpronomenform „Sie“ verweist auf eine höflich angesprochene Person.",
		translations: { en: ["you (formal singular)"] },
	},
	coverage: {
		transcription: "Unauthored",
		definition: "Authored",
		translations: { en: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "ReviewedEmpty",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
});
