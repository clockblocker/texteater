import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "sein",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "3",
		polite: null,
		poss: "Yes",
		pronType: "Prs",
		referenceNumber: "Sing",
		case: null,
		number: null,
		gender: null,
		"gender[psor]": "Neut",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔑" }, lemma },
	knowledge: {
		definition:
			"Das substantivische Possessivpronomen „sein“ bezeichnet etwas, das die sächliche dritte Person Einzahl zugeordnet ist.",
		translations: { en: ["its"] },
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
