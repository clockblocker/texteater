import type { Surface } from "../types.js";
import { type GrundformRule, inflectionalFeatures } from "./features.js";
import { lemmaRule, lexicalConvention } from "./lemma-rule.js";

// Modern Hebrew dictionaries conventionally cite regular verbs in past 3ms.
// The Hebrew schema marks only Inf/Part in verbForm; finite forms use null.
// https://hebrew.laits.utexas.edu/drupal/themes/hebrewgrid/bh/bhonline/grammar/verbs.pdf
const hebrewPast: GrundformRule = {
	features: {
		tense: ["Past"],
		person: ["3"],
		gender: ["Masc"],
		number: ["Sing"],
		verbForm: [null],
	},
};
function hebrewVerb(surface: Surface): GrundformRule {
	const core = surface.lemma.coreFeatures;
	if ("hebExistential" in core && core.hebExistential === "Yes")
		return ["יש", "אין"].includes(surface.lemma.canonicalForm)
			? { features: {} }
			: lexicalConvention;
	if (!("hebBinyan" in core) || core.hebBinyan === null)
		return lemmaRule(
			"Hebrew VERB needs a known Binyan or an established existential convention",
		);
	return hebrewPast;
}
function hebrewAuxiliary(surface: Surface): GrundformRule {
	if (surface.lemma.canonicalForm === "היה") return hebrewPast;
	return lexicalConvention;
}

function hebrewNoun(surface: Surface): GrundformRule {
	const number = inflectionalFeatures(surface)?.number;
	if (
		number === "Plur" ||
		number === "Dual" ||
		(Array.isArray(number) && !number.includes("Sing"))
	)
		return {
			...lemmaRule(
				"This Hebrew noun needs its Lemma's canonical Number convention",
			),
			features: { definite: ["Ind"] },
		};
	return { features: { number: ["Sing"], definite: ["Ind"] } };
}

function properNoun(surface: Surface): GrundformRule {
	if (inflectionalFeatures(surface)?.number === "Plur")
		return lemmaRule(
			"This Hebrew proper-name Lemma needs its canonical Number convention",
		);
	return { features: { number: ["Sing"] } };
}
export const hebrewRules = {
	"he/Lexeme/ADJ": {
		features: { gender: ["Masc"], number: ["Sing"], definite: [null] },
	},
	"he/Lexeme/AUX": hebrewAuxiliary,
	"he/Lexeme/DET": lexicalConvention,
	"he/Lexeme/NOUN": hebrewNoun,
	"he/Lexeme/NUM": lexicalConvention,
	"he/Lexeme/PRON": lexicalConvention,
	"he/Lexeme/PROPN": properNoun,
	"he/Lexeme/VERB": hebrewVerb,
} as const;
