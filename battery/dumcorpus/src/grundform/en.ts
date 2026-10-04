import type * as Dumling from "dumling/types";
import { adjective, adverb } from "./comparability.js";
import type { GrundformRule } from "./features.js";
import { lexicalConvention } from "./lemma-rule.js";

const infinitive: GrundformRule = {
	features: {
		verbForm: ["Inf"],
		mood: [null],
		person: [null],
		tense: [null],
		number: [null],
	},
};
const noun: GrundformRule = { features: { number: ["Sing", "Ptan"] } };
const verb: GrundformRule = {
	features: { ...infinitive.features, voice: [null] },
};
function englishAuxiliary(surface: Dumling.Surface): GrundformRule {
	const form = surface.lemma.canonicalForm;
	if (["be", "have", "do"].includes(form)) return infinitive;
	if (
		[
			"can",
			"could",
			"may",
			"might",
			"must",
			"shall",
			"should",
			"will",
			"would",
			"ought",
		].includes(form)
	)
		return { features: { verbForm: ["Fin"] } };
	return lexicalConvention;
}

export const englishRules = {
	// An English ADJ marks only Degree, never agreement (ADR 0042).
	"en/Lexeme/ADJ": adjective([]),
	"en/Lexeme/ADV": adverb,
	"en/Lexeme/AUX": englishAuxiliary,
	"en/Lexeme/DET": lexicalConvention,
	"en/Lexeme/NOUN": noun,
	"en/Lexeme/PROPN": noun,
	"en/Lexeme/SYM": lexicalConvention,
	"en/Lexeme/VERB": verb,
	// A Locution borrows the rule of the Lexeme route with its Kind (ADR 0039).
	"en/Locution/ADV": adverb,
	"en/Locution/NOUN": noun,
	"en/Locution/VERB": verb,
} as const;
