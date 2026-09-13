import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "ihm",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "3",
		polite: null,
		poss: null,
		pronType: "Prs",
		referenceNumber: "Sing",
		case: "Dat",
		number: "Sing",
		gender: "Masc",
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👤" }, lemma },
	knowledge: {
		definition:
			"Die Personalpronomenform „ihm“ verweist auf die männliche dritte Person Einzahl.",
		translations: { en: ["him"] },
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
