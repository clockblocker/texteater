import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "dein",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "2",
		polite: "Infm",
		poss: "Yes",
		pronType: "Prs",
		referenceNumber: "Sing",
		case: null,
		number: null,
		gender: null,
		"gender[psor]": null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔑" }, lemma },
	knowledge: {
		definition:
			"Das substantivische Possessivpronomen „dein“ bezeichnet etwas, das die angesprochene Einzahl zugeordnet ist.",
		translations: { en: ["yours"] },
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
