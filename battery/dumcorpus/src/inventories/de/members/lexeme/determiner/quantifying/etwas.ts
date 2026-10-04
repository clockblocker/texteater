import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../../../member.js";

// etwas before a noun is DET (etwas Ruhe), standing alone PRON (Rule
// de/pron-or-det-by-use). Like PRON etwas it does not inflect, so its
// coordinates stay unmarked, and it keeps PRON etwas's Emoji Description.
const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
	canonicalForm: "etwas",
	coreFeatures: {
		case: null,
		gender: null,
		number: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Ind",
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member: AuthoredMember = {
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "📦" }, lemma },
	knowledge: {
		transcription: "ˈɛtvas",
		definition:
			"Der quantifizierende Determinierer „etwas“ bezeichnet eine nicht näher bestimmte, meist kleine Menge des Bezeichneten: etwas Ruhe, etwas Geld.",
		translations: { en: ["some", "a little"], ru: ["немного"] },
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
