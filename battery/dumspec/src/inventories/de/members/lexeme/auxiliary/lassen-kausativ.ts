import type * as Dumling from "dumling/types";
import { defineAuthoredMember } from "../../../member.js";

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
	canonicalForm: "lassen",
	coreFeatures: {},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
/**
 * Causative lassen inside the target of the verb it serves, which carries
 * voice Cau (ADR 0026, Rule de/causative-lassen). Every other lassen is the
 * VERB lassen, the VERB sich lassen of the modal passive (lässt sich öffnen)
 * or a member of an Idiom (Rule de/idiom).
 */
export const member = defineAuthoredMember({
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🫴" }, lemma },
	knowledge: {
		transcription: "ˈlasn̩",
		definition:
			"„lassen“ als Hilfsverb des Kausativs: Mit dem Infinitiv sagt es, dass man etwas tun lässt, ohne dass der Satz nennt, wer es tut (lässt sich die Haare schneiden, hat den Zaun reparieren lassen).",
		translations: {
			en: ["have (something done), causative auxiliary"],
			ru: ["давать сделать, поручать (вспомогательный глагол каузатива)"],
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
