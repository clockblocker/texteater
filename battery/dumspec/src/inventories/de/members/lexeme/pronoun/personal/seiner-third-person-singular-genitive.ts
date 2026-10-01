import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "seiner",
	coreFeatures: {
		person: "3",
		polite: null,
		poss: null,
		pronType: "Prs",
		case: "Gen",
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
			"Die Personalpronomenform „seiner“ ist der Genitiv von „er“ und von „es“ und verweist auf die dritte Person Einzahl, männlich oder sächlich.",
		transcription: "ˈzaɪ̯nɐ",
		translations: { en: ["of him", "of it"], ru: ["его"] },
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
