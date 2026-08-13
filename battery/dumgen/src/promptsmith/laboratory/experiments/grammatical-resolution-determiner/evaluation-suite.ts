import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/determiner/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/determiner/prompt-source";
import { evaluateDeterminerGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-det-dev-indefinite-article-einen",
	"grammar-de-det-dev-demonstrative-diesem",
	"grammar-de-det-dev-emphatic-selben",
	"grammar-de-det-dev-exclamative-welch",
	"grammar-de-det-dev-interrogative-welchen",
	"grammar-de-det-dev-relative-welchem",
	"grammar-de-det-dev-negative-kein",
	"grammar-de-det-dev-total-alle",
	"grammar-de-det-dev-total-beide",
	"grammar-de-det-dev-indefinite-viele",
	"grammar-de-det-dev-comparative-mehr",
	"grammar-de-det-dev-comparative-weniger",
	"grammar-de-det-dev-superlative-meisten",
	"grammar-de-det-dev-possessive-deinen",
	"grammar-de-det-dev-possessive-unserem",
	"grammar-de-det-dev-possessive-seinen-masc",
	"grammar-de-det-dev-possessive-sein-neut",
	"grammar-de-det-dev-possessive-ihr-fem",
	"grammar-de-det-dev-formal-ihrem",
	"grammar-de-det-dev-foreign-the",
	"grammar-de-det-dev-ordinal-wievielte",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-det-accept-v4-definite-des",
	"grammar-de-det-accept-v4-indefinite-ein",
	"grammar-de-det-accept-v4-demonstrative-jenem",
	"grammar-de-det-accept-v4-interrogative-welches",
	"grammar-de-det-accept-v4-negative-keinen",
	"grammar-de-det-accept-v4-total-jeder",
	"grammar-de-det-accept-v4-possessive-deinem",
	"grammar-de-det-accept-v4-formal-ihrem",
	"grammar-de-det-accept-v4-indefinite-manches",
	"grammar-de-det-accept-v4-typo-disem",
	"grammar-de-det-accept-v4-variant-n",
	"grammar-de-det-accept-v4-archaic-etwelches",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("DET demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"DET demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"DET development and untouched acceptance must be disjoint.",
	);
}

export const determinerGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateDeterminerGrammaticalResolution,
});

export const determinerGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateDeterminerGrammaticalResolution,
	});
