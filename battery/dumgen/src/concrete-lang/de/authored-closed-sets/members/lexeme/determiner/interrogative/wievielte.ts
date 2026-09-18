import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "wievielte",
	coreFeatures: {
		definite: null,
		extPos: null,
		foreign: null,
		numType: "Ord",
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
		transcription: "viˈfiːltə",
		definition:
			"Der interrogative Determinierer „wievielte“ fragt nach Auswahl oder Menge.",
		translations: { en: ["which numbered"], ru: ["который по счёту"] },
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
