import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "ihr",
	coreFeatures: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: null,
		person: "3",
		polite: null,
		poss: "Yes",
		pronType: "Prs",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔐" }, lemma },
	knowledge: {
		transcription: "iːɐ̯",
		definition:
			"Der Possessivartikel „ihr“ ordnet den bezeichneten Gegenstand einem femininen Bezug im Singular oder einem Bezug im Plural zu.",
		translations: { en: ["her", "their"], ru: ["её", "их"] },
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
