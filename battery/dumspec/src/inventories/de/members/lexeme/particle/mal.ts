import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

// Softening mal is a PART of its own, not a spelling of einmal: Duden lists
// mal as a Partikel headword that "verleiht einer Äußerung eine gewisse
// Beiläufigkeit" (hör mal zu, ich versuche es mal). Its one Reading is that
// softening. A relation to einmal can be claimed here later.
// https://www.duden.de/rechtschreibung/mal_nun_mal_beilaeufig
const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PART",
	canonicalForm: "mal",
	coreFeatures: {
		abbr: null,
		partType: null,
		polarity: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🤏" }, lemma },
	knowledge: {
		transcription: "maːl",
		definition:
			"Verleiht einer Äußerung eine gewisse Beiläufigkeit und macht eine Bitte oder Aufforderung weniger streng: Hör mal zu! Ich versuche es mal. Leihst du mir das Buch mal?",
		translations: { en: ["just"], ru: ["-ка"] },
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
