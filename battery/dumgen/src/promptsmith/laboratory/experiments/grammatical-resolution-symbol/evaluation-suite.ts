import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/symbol/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/symbol/prompt-source";
import { evaluateSymbolGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-sym-dev-math-plus",
	"grammar-de-sym-dev-math-minus",
	"grammar-de-sym-dev-science-integral",
	"grammar-de-sym-dev-measurement-micro",
	"grammar-de-sym-dev-measurement-degree",
	"grammar-de-sym-dev-measurement-permille",
	"grammar-de-sym-dev-currency-dollar",
	"grammar-de-sym-dev-currency-pound",
	"grammar-de-sym-dev-legal-copyright",
	"grammar-de-sym-dev-coordinator-ampersand",
	"grammar-de-sym-dev-marker-hash",
	"grammar-de-sym-dev-emoticon-wink",
	"grammar-de-sym-dev-repeated-plus-second",
	"grammar-de-sym-dev-numeric-neighbor-percent",
	"grammar-de-sym-dev-punctuation-neighbor-star",
	"grammar-de-sym-dev-opaque-neighbor-hash",
	"grammar-de-sym-dev-abbreviation-neighbor-section",
	"grammar-de-sym-dev-inflection-acc-plus",
	"grammar-de-sym-dev-inflection-gen-percent",
	"grammar-de-sym-dev-inflection-feminine-at",
	"grammar-de-sym-dev-archaic-dagger",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-sym-accept-v2-division-inflection",
	"grammar-de-sym-accept-v2-not-equal",
	"grammar-de-sym-accept-v2-sum",
	"grammar-de-sym-accept-v2-rupee",
	"grammar-de-sym-accept-v2-registered",
	"grammar-de-sym-accept-v2-double-arrow",
	"grammar-de-sym-accept-v2-basis-point",
	"grammar-de-sym-accept-v2-card-numero",
	"grammar-de-sym-accept-v2-range-tilde",
	"grammar-de-sym-accept-v2-foreign-japanese-reference",
	"grammar-de-sym-accept-v2-variant-small-percent",
	"grammar-de-sym-accept-v2-typo-double-permille",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("SYM demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"SYM demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"SYM development and untouched acceptance must be disjoint.",
	);
}

export const evaluation = developmentEvaluation;

export const symbolGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateSymbolGrammaticalResolution,
});

export const symbolGrammaticalResolutionAcceptanceExperiment = defineExperiment(
	{
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateSymbolGrammaticalResolution,
	},
);
