import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/other/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/other/prompt-source";
import { evaluateOtherGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-x-unresolved-opaque-hebrew-shalom",
	"grammar-de-x-unresolved-opaque-french-bonjour",
	"grammar-de-x-unresolved-opaque-japanese-arigatou",
	"grammar-de-x-unresolved-opaque-swedish-chocktillstand",
	"grammar-de-x-unresolved-abbreviation-zb",
	"grammar-de-x-unresolved-typo-gelauffen",
	"grammar-de-x-unresolved-foreign-noun-house",
	"grammar-de-x-unresolved-propn-paris",
	"grammar-de-x-unresolved-propn-apple",
	"grammar-de-x-unresolved-intj-ouch",
	"grammar-de-x-unresolved-sym-percent",
	"grammar-de-x-unresolved-sym-dagger",
	"grammar-de-x-unresolved-punct-exclamation",
	"grammar-de-x-unresolved-opaque-question-marks",
	"grammar-de-x-unresolved-fragment-unver",
	"grammar-de-x-unresolved-email",
	"grammar-de-x-unresolved-overbroad-good-morning",
	"grammar-de-x-unresolved-repeated-bonjour",
	"grammar-de-x-unresolved-unbalanced-bonjour",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"X Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const otherGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateOtherGrammaticalResolution,
});
