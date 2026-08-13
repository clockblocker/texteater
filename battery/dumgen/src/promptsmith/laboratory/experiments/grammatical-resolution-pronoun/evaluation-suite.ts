import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { evaluatePronounGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-pron-dev-personal-ich",
	"grammar-de-pron-dev-personal-sie-fem",
	"grammar-de-pron-dev-personal-sie-plur-acc",
	"grammar-de-pron-dev-personal-euch",
	"grammar-de-pron-dev-formal-sie-nom",
	"grammar-de-pron-dev-reflexive-mich",
	"grammar-de-pron-dev-nonreflexive-mich",
	"grammar-de-pron-dev-reciprocal-einander",
	"grammar-de-pron-dev-inherent-reflexive-sich",
	"grammar-de-pron-dev-demonstrative-das-nom",
	"grammar-de-pron-dev-relative-die-nom",
	"grammar-de-pron-dev-interrogative-wer-nom",
	"grammar-de-pron-dev-indefinite-jemandem",
	"grammar-de-pron-dev-negative-niemanden",
	"grammar-de-pron-dev-total-foreign-all",
	"grammar-de-pron-dev-extpos-was",
	"grammar-de-pron-dev-poss-meiner",
	"grammar-de-pron-dev-contraction-s",
	"grammar-de-pron-dev-typo-ihc",
	"grammar-de-pron-dev-archaic-euer",
	"grammar-de-pron-dev-formal-lowercase-typo",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-pron-accept-v4-personal-dir-dat",
	"grammar-de-pron-accept-v4-personal-wir-nom",
	"grammar-de-pron-accept-v4-formal-ihnen-dat",
	"grammar-de-pron-accept-v4-reflexive-euch-acc",
	"grammar-de-pron-accept-v4-demonstrative-die-nom-plur",
	"grammar-de-pron-accept-v4-relative-dem-dat-neut",
	"grammar-de-pron-accept-v4-interrogative-wem-dat",
	"grammar-de-pron-accept-v4-indefinite-irgendjemandem-dat",
	"grammar-de-pron-accept-v4-negative-niemanden-acc",
	"grammar-de-pron-accept-v4-reciprocal-einander",
	"grammar-de-pron-accept-v4-negative-nichts",
	"grammar-de-pron-accept-v4-foreign-he",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("PRON demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PRON demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"PRON development and untouched acceptance must be disjoint.",
	);
}

export const pronounGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluatePronounGrammaticalResolution,
});

export const pronounGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluatePronounGrammaticalResolution,
	});
