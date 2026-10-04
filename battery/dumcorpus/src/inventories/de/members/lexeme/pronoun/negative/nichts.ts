import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "nichts",
	coreFeatures: {
		person: null,
		polite: null,
		poss: null,
		pronType: "Neg",
		case: null,
		number: null,
		gender: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member: AuthoredMember = {
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🚫" }, lemma },
	knowledge: {
		definition:
			"Das Negativpronomen „nichts“ verneint das Vorhandensein einer Sache.",
		transcription: "nɪçts",
		translations: { en: ["nothing"], ru: ["ничто", "ничего"] },
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
};
