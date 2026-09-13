import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "wieviel",
	coreFeatures: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Int",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "❓🔢" }, lemma },
	knowledge: {
		definition:
			"Der interrogative Determinierer „wieviel“ fragt nach Auswahl oder Menge.",
		translations: { en: ["how much", "how many"] },
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
