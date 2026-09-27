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
	reading: { ...{ unitKind: "Reading", emojiDescription: "💭" }, lemma },
	knowledge: {
		transcription: "ˈveːɐ̯dn̩",
		definition:
			"„würde“ als Hilfsverb des Konjunktivs II: Mit dem Infinitiv drückt es Hypothetisches, Irreales oder Höfliches aus (würde kommen, würden Sie bitte warten).",
		translations: {
			en: ["would (subjunctive auxiliary)"],
			ru: ["бы (вспомогательный глагол конъюнктива II)"],
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
