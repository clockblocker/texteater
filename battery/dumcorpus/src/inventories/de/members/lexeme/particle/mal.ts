import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../member.js";
import { modalParticleLemma } from "./modal-particles.js";

// Softening mal is a modal particle of its own, PART with partType Mod, not
// a spelling of einmal: Duden lists mal as a Partikel headword that
// "verleiht einer Äußerung eine gewisse Beiläufigkeit" (hör mal zu, ich
// versuche es mal). Its one Reading is that softening, a synonym of the
// modal particle einmal (#734).
// https://www.duden.de/rechtschreibung/mal_nun_mal_beilaeufig
const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PART",
	canonicalForm: "mal",
	coreFeatures: {
		partType: "Mod",
		polarity: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member: AuthoredMember = {
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🤏" }, lemma },
	knowledge: {
		transcription: "maːl",
		definition:
			"Verleiht einer Äußerung eine gewisse Beiläufigkeit und macht eine Bitte oder Aufforderung weniger streng: Hör mal zu! Ich versuche es mal. Leihst du mir das Buch mal?",
		translations: { en: ["just"], ru: ["-ка"] },
		semanticRelations: { synonym: [modalParticleLemma("einmal")] },
	},
	coverage: {
		transcription: "Authored",
		definition: "Authored",
		translations: { en: "Authored", ru: "Authored" },
		semanticRelationTargetKind: "lemma",
		semanticRelations: {
			synonym: "Authored",
			nearSynonym: "ReviewedEmpty",
			antonym: "ReviewedEmpty",
			nearAntonym: "ReviewedEmpty",
		},
	},
};
