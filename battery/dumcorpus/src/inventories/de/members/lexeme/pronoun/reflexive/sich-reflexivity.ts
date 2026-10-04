import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../../../../../member.js";

/**
 * The reflexivity unit a reflexive drills down to (system ADR 0041), beside
 * the Acc and Dat cells of sich. Its Core marks no case, person or number, so
 * it is neither cell. German PRON has no reflexivity feature in Core (system
 * ADR 0032): reflexivity is Surface evidence and this unit's Knowledge.
 */
const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "sich",
	coreFeatures: {
		person: null,
		polite: null,
		poss: null,
		pronType: "Prs",
		case: null,
		number: null,
		gender: null,
	},
	unitKind: "Lemma",
} satisfies Dumling.Lemma<"de">;
export const member: AuthoredMember = {
	lemma,
	reading: { ...{ unitKind: "Reading", emojiDescription: "🪞" }, lemma },
	knowledge: {
		definition:
			"Ein Reflexivpronomen verweist auf das Subjekt desselben Satzes zurück. Seine Form richtet sich nach der Person des Subjekts: ich – mich (Akkusativ) oder mir (Dativ), du – dich oder dir, er, sie, es und Sie – sich, wir – uns, ihr – euch. Nur mich/mir und dich/dir unterscheiden den Kasus; die übrigen Formen gelten für beide. Der Akkusativ steht, wenn das Pronomen das einzige Objekt ist: Ich wasche mich. Der Dativ steht, wenn daneben ein Akkusativobjekt steht: Ich wasche mir die Hände. Manche Verben sind immer reflexiv, und das Pronomen gehört fest zum Verb: sich schämen verlangt den Akkusativ (Ich schäme mich), sich etwas einbilden den Dativ (Ich bilde mir etwas ein).",
		transcription: "zɪç",
		translations: {
			en: [
				"oneself",
				"myself; yourself; himself; herself; itself; ourselves; yourselves; themselves",
			],
			ru: ["себя", "себе", "-ся"],
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
};
