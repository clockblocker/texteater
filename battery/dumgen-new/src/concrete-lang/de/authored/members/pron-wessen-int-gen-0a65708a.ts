import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "wessen",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Int",
		referenceNumber: null,
		case: "Gen",
		number: null,
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "❓" }, lemma },
	knowledge: {
		definition:
			"Das Interrogativpronomen „wessen“ fragt nach einer Person in der durch seine Form ausgedrückten Kasusrolle.",
		translations: { en: ["whose"] },
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
