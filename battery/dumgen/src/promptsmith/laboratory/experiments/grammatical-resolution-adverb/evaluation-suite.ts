import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/adverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/adverb/prompt-source";
import { evaluateAdverbGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-adv-dev-temporal-morgen",
	"grammar-de-adv-dev-initial-vielleicht",
	"grammar-de-adv-dev-demonstrative-damit",
	"grammar-de-adv-dev-relative-weshalb",
	"grammar-de-adv-dev-negative-keineswegs",
	"grammar-de-adv-dev-multiplicative-zweimal",
	"grammar-de-adv-dev-positive-viel",
	"grammar-de-adv-dev-cardinal-2x",
	"grammar-de-adv-dev-foreign-remotely",
	"grammar-de-adv-dev-comparative-weniger",
	"grammar-de-adv-dev-superlative-am-fruehesten",
	"grammar-de-adv-dev-typo-vielleich",
	"grammar-de-adv-dev-variant-bisschen",
	"grammar-de-adv-dev-abbreviation-ca",
	"grammar-de-adv-dev-route-sconj-da",
	"grammar-de-adv-dev-route-part-doch",
	"grammar-de-adv-dev-route-adp-davor",
	"grammar-de-adv-dev-route-adj-gern",
	"grammar-de-adv-dev-route-paired-frame-auch",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-adv-accept-temporal-gestern",
	"grammar-de-adv-accept-locative-hier",
	"grammar-de-adv-accept-initial-draussen",
	"grammar-de-adv-accept-demonstrative-dafuer",
	"grammar-de-adv-accept-indefinite-wenig",
	"grammar-de-adv-accept-interrogative-wo",
	"grammar-de-adv-accept-relative-wobei",
	"grammar-de-adv-accept-negative-nie",
	"grammar-de-adv-accept-multiplicative-dreimal",
	"grammar-de-adv-accept-comparative-oefter",
	"grammar-de-adv-accept-typo-morgne",
	"grammar-de-adv-accept-archaic-allhier",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("ADV demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"ADV demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"ADV development and untouched acceptance must be disjoint.",
	);
}

export const adverbGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateAdverbGrammaticalResolution,
});

export const adverbGrammaticalResolutionAcceptanceExperiment = defineExperiment(
	{
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateAdverbGrammaticalResolution,
	},
);
