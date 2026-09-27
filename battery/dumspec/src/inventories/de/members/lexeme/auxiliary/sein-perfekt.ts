import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "sein",
	coreFeatures: {
		verbType: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
/** One grammatical use of sein; the serving verb's form selects it (ADR 0026). */
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🏁" }, lemma },
	knowledge: {
		transcription: "zaɪn",
		definition:
			"„sein“ als Hilfsverb des Perfekts: Mit dem Partizip II von Verben der Bewegung und der Zustandsänderung bildet es Perfekt und Plusquamperfekt (ist gegangen, war eingeschlafen).",
		translations: {
			en: ["be (perfect auxiliary)"],
			ru: ["быть (вспомогательный глагол перфекта)"],
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
