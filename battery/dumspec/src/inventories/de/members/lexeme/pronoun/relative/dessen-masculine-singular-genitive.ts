import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "dessen",
	coreFeatures: {
		person: null,
		polite: null,
		poss: null,
		pronType: "Rel",
		case: "Gen",
		number: "Sing",
		gender: "Masc",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🔗" }, lemma },
	knowledge: {
		definition:
			"Das Relativpronomen „dessen“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort. Vor einem Nomen ordnet es dieses dem Bezugswort zu: der Autor, dessen Buch fehlt.",
		transcription: "ˈdɛsn̩",
		translations: {
			en: ["whose", "who", "which", "that"],
			ru: ["которого", "чей"],
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
