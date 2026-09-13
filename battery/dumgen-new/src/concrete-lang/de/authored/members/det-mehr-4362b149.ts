import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "mehr",
	coreFeatures: {
		definite: null,
		extPos: "DET",
		foreign: null,
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Ind",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "➕" }, lemma },
	knowledge: {
		definition:
			"Der quantifizierende Determinierer „mehr“ grenzt die Menge der bezeichneten Bezüge ein.",
		translations: { en: ["more"] },
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
