import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "seiner",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "3",
		polite: null,
		poss: null,
		pronType: "Prs",
		case: "Gen",
		number: "Sing",
		gender: ["Masc", "Neut"],
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "👈" }, lemma },
	knowledge: {
		definition:
			"Die Personalpronomenform „seiner“ ist der Genitiv von „er“ und „es“ und verweist auf die männliche oder sächliche dritte Person Einzahl.",
		transcription: "ˈzaɪ̯nɐ",
		translations: {
			en: ["of him, of it (genitive of er/es)"],
			ru: ["его"],
		},
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
