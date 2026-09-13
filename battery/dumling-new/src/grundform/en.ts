import type { Surface } from "../types.js";
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
const positive: GrundformRule = { features: { degree: ["Pos"] } };
function englishAuxiliary(surface: Surface): GrundformRule {
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
	"en/Lexeme/ADJ": positive,
	"en/Lexeme/ADV": positive,
	"en/Lexeme/AUX": englishAuxiliary,
	"en/Lexeme/DET": lexicalConvention,
	"en/Lexeme/NOUN": noun,
	"en/Lexeme/PRON": lexicalConvention,
	"en/Lexeme/PROPN": noun,
	"en/Lexeme/SYM": lexicalConvention,
	"en/Lexeme/VERB": { features: { ...infinitive.features, voice: [null] } },
} as const;
