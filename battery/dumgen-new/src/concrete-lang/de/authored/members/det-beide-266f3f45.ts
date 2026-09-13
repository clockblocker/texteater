import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "beide",
	coreFeatures: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: "Card",
		person: null,
		polite: null,
		poss: null,
		pronType: "Tot",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "2️⃣" }, lemma },
	knowledge: {
		definition:
			"Der totalisierende Determinierer „beide“ erfasst die bezeichnete Menge vollständig.",
		translations: { en: ["both"] },
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
