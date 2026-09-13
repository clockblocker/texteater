import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "Ihr",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "2",
		polite: "Form",
		poss: "Yes",
		pronType: "Prs",
		referenceNumber: null,
		case: null,
		number: null,
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔑" }, lemma },
	knowledge: {
		definition:
			"Das substantivische Possessivpronomen „Ihr“ bezeichnet etwas, das eine höflich angesprochene Person oder Gruppe zugeordnet ist.",
		translations: { en: ["yours (formal)"] },
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
