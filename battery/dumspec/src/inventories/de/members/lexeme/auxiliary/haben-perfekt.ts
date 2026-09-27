import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "haben",
	coreFeatures: {
		verbType: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
/** One grammatical use of haben; the serving verb's form selects it (ADR 0026). */
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "✅" }, lemma },
	knowledge: {
		transcription: "ˈhaːbn̩",
		definition:
			"„haben“ als Hilfsverb des Perfekts: Mit dem Partizip II der meisten Verben bildet es Perfekt und Plusquamperfekt (hat gegessen, hatte gelesen).",
		translations: {
			en: ["have (perfect auxiliary)"],
			ru: ["иметь (вспомогательный глагол перфекта)"],
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
