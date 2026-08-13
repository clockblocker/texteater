import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/particle/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/particle/prompt-source";
import { evaluateParticleGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-part-dev-negative-initial",
	"grammar-de-part-dev-answer-ja",
	"grammar-de-part-dev-foreign-not",
	"grammar-de-part-dev-abbreviation-n",
	"grammar-de-part-dev-modal-doch",
	"grammar-de-part-dev-modal-denn",
	"grammar-de-part-dev-modal-wohl",
	"grammar-de-part-dev-modal-mal",
	"grammar-de-part-dev-modal-ja",
	"grammar-de-part-dev-focus-nur",
	"grammar-de-part-dev-focus-selbst",
	"grammar-de-part-dev-intensifying-sehr",
	"grammar-de-part-dev-answer-doch",
	"grammar-de-part-dev-infinitival-beside-adp",
	"grammar-de-part-dev-focus-beside-adv",
	"grammar-de-part-dev-modal-beside-sconj",
	"grammar-de-part-dev-modal-aber-not-cconj",
	"grammar-de-part-dev-beside-verb-particle",
	"grammar-de-part-dev-variant-nich",
	"grammar-de-part-dev-typo-dohc",
	"grammar-de-part-dev-other-eigentlich",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-part-accept-v2-negative-nicht",
	"grammar-de-part-accept-v2-infinitival-zu",
	"grammar-de-part-accept-v2-answer-doch",
	"grammar-de-part-accept-v2-foreign-never",
	"grammar-de-part-accept-v2-abbreviation-pos",
	"grammar-de-part-accept-v2-modal-bloss",
	"grammar-de-part-accept-v2-focus-lediglich",
	"grammar-de-part-accept-v2-intensifying-gar",
	"grammar-de-part-accept-v2-modal-ja-not-intj",
	"grammar-de-part-accept-v2-typo-nciht",
	"grammar-de-part-accept-v2-explicit-variant-nedd",
	"grammar-de-part-accept-v2-distinct-archaic-en",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("PART demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PART demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"PART development and untouched acceptance must be disjoint.",
	);
}

export const evaluation = developmentEvaluation;

export const particleGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateParticleGrammaticalResolution,
});

export const particleGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateParticleGrammaticalResolution,
	});
