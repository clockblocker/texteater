import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "welch",
	coreFeatures: {
		case: null,
		definite: null,
		extPos: null,
		foreign: null,
		gender: null,
		number: null,
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Exc",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "❗" }, lemma },
	knowledge: {
		transcription: "vɛlç",
		definition:
			"Der exklamative Determinierer „welch“ leitet eine hervorhebende Ausrufkonstruktion ein.",
		translations: { en: ["what a"], ru: ["какой"] },
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
