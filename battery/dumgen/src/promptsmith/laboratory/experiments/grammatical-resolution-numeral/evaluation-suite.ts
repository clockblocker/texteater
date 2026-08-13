import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/numeral/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/numeral/prompt-source";
import { evaluateNumeralGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-num-dev-initial-fuenf",
	"grammar-de-num-dev-decimal-drei-komma-vierzehn",
	"grammar-de-num-dev-year-2024",
	"grammar-de-num-dev-roman-xiv",
	"grammar-de-num-dev-abbreviation-t",
	"grammar-de-num-dev-foreign-three",
	"grammar-de-num-dev-distributive-zwei",
	"grammar-de-num-dev-collective-zwei",
	"grammar-de-num-dev-multi-member-ein-komma-fuenf",
	"grammar-de-num-dev-multiplicative-dreifach",
	"grammar-de-num-dev-inflected-million-acc",
	"grammar-de-num-dev-inflected-millionen-gen",
	"grammar-de-num-dev-archaic-zween",
	"grammar-de-num-dev-variant-zwo",
	"grammar-de-num-dev-route-adj-drei",
	"grammar-de-num-dev-route-det-zwei",
	"grammar-de-num-dev-route-pron-drei",
	"grammar-de-num-dev-route-noun-eins",
	"grammar-de-num-dev-route-symbol-7",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-num-accept-v3-word-dreizehn",
	"grammar-de-num-accept-v3-digit-73",
	"grammar-de-num-accept-v3-decimal-sieben-komma-acht",
	"grammar-de-num-accept-v3-year-1987",
	"grammar-de-num-accept-v3-roman-xix",
	"grammar-de-num-accept-v3-multi-member-vier-komma-neun",
	"grammar-de-num-accept-v3-fraction-siebenachtel",
	"grammar-de-num-accept-v3-multiplicative-sechsfach",
	"grammar-de-num-accept-v3-range-zwoelf-bis-sechzehn",
	"grammar-de-num-accept-v3-inflected-quadrillionen-nom",
	"grammar-de-num-accept-v3-typo-neunzhen",
	"grammar-de-num-accept-v3-archaic-fuenff",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("NUM demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"NUM demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"NUM development and untouched acceptance must be disjoint.",
	);
}

export const numeralGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateNumeralGrammaticalResolution,
});

export const numeralGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateNumeralGrammaticalResolution,
	});
