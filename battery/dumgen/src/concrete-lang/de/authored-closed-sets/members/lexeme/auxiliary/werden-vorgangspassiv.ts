import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "werden",
	coreFeatures: {
		verbType: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
/** One grammatical use of werden; the serving verb's form selects it (ADR 0026). */
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔄" }, lemma },
	knowledge: {
		transcription: "ˈveːɐ̯dn̩",
		definition:
			"„werden“ als Hilfsverb des Vorgangspassivs: Mit dem Partizip II beschreibt es eine Handlung aus Sicht des Betroffenen (wird repariert, ist genehmigt worden).",
		translations: {
			en: ["be (processual passive auxiliary)"],
			ru: ["вспомогательный глагол пассива действия"],
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
