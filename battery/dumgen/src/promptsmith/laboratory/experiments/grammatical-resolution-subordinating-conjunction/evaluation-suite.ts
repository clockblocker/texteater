import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/lexeme/subordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/lexeme/subordinating-conjunction/prompt-source";
import { evaluateSubordinatingConjunctionGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-sconj-dev-complement-dass",
	"grammar-de-sconj-dev-conditional-wenn",
	"grammar-de-sconj-dev-temporal-nachdem",
	"grammar-de-sconj-dev-temporal-waehrend",
	"grammar-de-sconj-dev-interrogative-ob",
	"grammar-de-sconj-dev-temporal-bevor",
	"grammar-de-sconj-dev-conditional-falls",
	"grammar-de-sconj-dev-temporal-seitdem",
	"grammar-de-sconj-dev-temporal-sobald",
	"grammar-de-sconj-dev-modal-indem",
	"grammar-de-sconj-dev-causal-zumal",
	"grammar-de-sconj-dev-comparative-als-clause",
	"grammar-de-sconj-dev-comparative-wie-clause",
	"grammar-de-sconj-dev-temporal-als",
	"grammar-de-sconj-dev-adversative-wohingegen",
	"grammar-de-sconj-dev-concessive-obgleich",
	"grammar-de-sconj-dev-conditional-sofern",
	"grammar-de-sconj-dev-temporal-bis",
	"grammar-de-sconj-dev-multiword-als-ob",
	"grammar-de-sconj-dev-variant-sodass",
	"grammar-de-sconj-dev-beside-adp-waehrend",
	"grammar-de-sconj-dev-beside-cconj-denn",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-sconj-accept-v2-finite-obwohl",
	"grammar-de-sconj-accept-v2-purpose-damit",
	"grammar-de-sconj-accept-v2-conditional-wenn",
	"grammar-de-sconj-accept-v2-interrogative-ob",
	"grammar-de-sconj-accept-v2-infinitival-ohne",
	"grammar-de-sconj-accept-v2-comparative-als",
	"grammar-de-sconj-accept-v2-reduced-wie",
	"grammar-de-sconj-accept-v2-multiword-als-wenn",
	"grammar-de-sconj-accept-v2-initial-falls",
	"grammar-de-sconj-accept-v2-typo-obwhol",
	"grammar-de-sconj-accept-v2-archaic-dieweil",
	"grammar-de-sconj-accept-v2-variant-so-dass",
	"grammar-de-sconj-accept-v2-beside-adv-da",
	"grammar-de-sconj-accept-v2-beside-part-ja",
	"grammar-de-sconj-accept-v2-beside-frame-and-abbreviation",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("SCONJ demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"SCONJ demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error("SCONJ development and acceptance must be disjoint.");
}

export const evaluation = developmentEvaluation;

export const subordinatingConjunctionGrammaticalResolutionExperiment =
	defineExperiment({
		promptSource,
		evaluation: developmentEvaluation,
		evaluator: evaluateSubordinatingConjunctionGrammaticalResolution,
	});

export const subordinatingConjunctionGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateSubordinatingConjunctionGrammaticalResolution,
	});
