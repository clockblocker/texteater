import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/proper-noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/proper-noun/prompt-source";
import { evaluateProperNounGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-propn-dev-person-anna-acc",
	"grammar-de-propn-dev-person-peters-gen",
	"grammar-de-propn-dev-place-schweiz",
	"grammar-de-propn-dev-place-niederlanden",
	"grammar-de-propn-dev-org-deutsche-bank",
	"grammar-de-propn-dev-org-spd",
	"grammar-de-propn-dev-product-iphone",
	"grammar-de-propn-dev-product-adidas",
	"grammar-de-propn-dev-work-zauberfloete",
	"grammar-de-propn-dev-work-prozess",
	"grammar-de-propn-dev-citation-hamburg",
	"grammar-de-propn-dev-vocative-lukas",
	"grammar-de-propn-dev-foreign-new-york",
	"grammar-de-propn-dev-transliteration-kyjiw",
	"grammar-de-propn-dev-variant-pressburg",
	"grammar-de-propn-dev-typo-muenchn",
	"grammar-de-propn-dev-casing-berLin",
	"grammar-de-propn-dev-multi-johann-goethe",
	"grammar-de-propn-dev-neighbor-city-berlin",
	"grammar-de-propn-dev-repeated-second-peter",
	"grammar-de-propn-dev-plural-alpen",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-propn-accept-v3-person-leonie",
	"grammar-de-propn-accept-v3-place-saarland",
	"grammar-de-propn-accept-v3-multi-garmisch-partenkirchen",
	"grammar-de-propn-accept-v3-org-zdf",
	"grammar-de-propn-accept-v3-product-thermomix",
	"grammar-de-propn-accept-v3-work-nibelungenlied",
	"grammar-de-propn-accept-v3-citation-mainz",
	"grammar-de-propn-accept-v3-foreign-rio-de-janeiro",
	"grammar-de-propn-accept-v3-genitive-max",
	"grammar-de-propn-accept-v3-typo-hannnover",
	"grammar-de-propn-accept-v3-variant-preussen",
	"grammar-de-propn-accept-v3-plural-balearen",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("PROPN demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PROPN demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"PROPN development and untouched acceptance must be disjoint.",
	);
}

export const evaluation = developmentEvaluation;

export const properNounGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateProperNounGrammaticalResolution,
});

export const properNounGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateProperNounGrammaticalResolution,
	});
