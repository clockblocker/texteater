import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "der",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Dem",
		referenceNumber: null,
		case: "Nom",
		number: "Sing",
		gender: "Masc",
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👉" }, lemma },
	knowledge: {
		definition:
			"Das Demonstrativpronomen „der“ verweist betont auf eine im Kontext bestimmte Person oder Sache.",
		transcription: "deːɐ̯",
		translations: { en: ["that one", "this one"], ru: ["тот", "этот"] },
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
