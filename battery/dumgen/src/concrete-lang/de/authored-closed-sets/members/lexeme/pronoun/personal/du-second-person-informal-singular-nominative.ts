import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "du",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "2",
		polite: "Infm",
		poss: null,
		pronType: "Prs",
		case: "Nom",
		number: "Sing",
		gender: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👈" }, lemma },
	knowledge: {
		definition:
			"Die Personalpronomenform „du“ verweist auf die angesprochene Einzahl.",
		transcription: "duː",
		translations: { en: ["you"], ru: ["ты"] },
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
