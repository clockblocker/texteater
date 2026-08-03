import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/prompt-source";
import { evaluateSubordinatingConjunctionGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-sconj-citation-dass",
	"grammar-de-sconj-complement-dass",
	"grammar-de-sconj-conditional-wenn",
	"grammar-de-sconj-temporal-nachdem",
	"grammar-de-sconj-temporal-waehrend",
	"grammar-de-sconj-interrogative-ob",
	"grammar-de-sconj-temporal-bevor",
	"grammar-de-sconj-conditional-falls",
	"grammar-de-sconj-temporal-seitdem",
	"grammar-de-sconj-temporal-sobald",
	"grammar-de-sconj-modal-indem",
	"grammar-de-sconj-causal-zumal",
	"grammar-de-sconj-comparative-als-clause",
	"grammar-de-sconj-sentence-initial-dass",
	"grammar-de-sconj-typo-wehn",
	"grammar-de-sconj-unresolved-adp-waehrend",
	"grammar-de-sconj-unresolved-adv-dann",
	"grammar-de-sconj-unresolved-cconj-denn",
	"grammar-de-sconj-unresolved-cconj-comparative-als",
	"grammar-de-sconj-unresolved-adp-als",
	"grammar-de-sconj-unresolved-adv-darum",
	"grammar-de-sconj-unresolved-overbroad-dass-er",
	"grammar-de-sconj-unresolved-two-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"SCONJ Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const subordinatingConjunctionGrammaticalResolutionExperiment =
	defineExperiment({
		promptSource,
		evaluation,
		evaluator: evaluateSubordinatingConjunctionGrammaticalResolution,
	});
