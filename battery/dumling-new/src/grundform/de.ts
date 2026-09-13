import type { Surface } from "../types.js";
import {
	type FeatureRequirements,
	type GrundformRule,
	inflectionalFeatures,
} from "./features.js";
import { lemmaRule, lexicalConvention } from "./lemma-rule.js";

const infinitive: GrundformRule = {
	features: {
		verbForm: ["Inf"],
		mood: [null],
		person: [null],
		tense: [null],
		number: [null],
		voice: [null, "Act"],
	},
};
const adjective: GrundformRule = {
	features: { degree: ["Pos"], case: [null], gender: [null], number: [null] },
};
function noun(surface: Surface): GrundformRule {
	const features: FeatureRequirements = { case: ["Nom"] };
	if (inflectionalFeatures(surface)?.number === "Plur")
		return {
			...lemmaRule(
				"Plural evidence does not establish whether this Lemma has a plural-only canonical form",
			),
			features,
		};
	return { features: { ...features, number: ["Sing"] } };
}
// German PRON Case, Gender and Number distinguish the Lemma itself.
// Valid realizations need no separate inflectional citation-form requirement.
const germanPronoun: GrundformRule = { features: {} };

export const germanRules = {
	"de/Lexeme/ADJ": adjective,
	"de/Lexeme/ADV": { features: { degree: ["Pos"] } },
	"de/Lexeme/AUX": infinitive,
	"de/Lexeme/DET": lexicalConvention,
	"de/Lexeme/NOUN": noun,
	"de/Lexeme/NUM": lexicalConvention,
	"de/Lexeme/X": lexicalConvention,
	"de/Lexeme/PRON": germanPronoun,
	"de/Lexeme/PROPN": noun,
	"de/Lexeme/SYM": lexicalConvention,
	"de/Lexeme/VERB": infinitive,
	"de/Phraseme/Collocation": infinitive,
	"de/Phraseme/Idiom": infinitive,
} as const;
