import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/adposition/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { evaluateAdpositionGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-adp-preposition-durch-acc",
	"grammar-de-adp-preposition-zu-dat",
	"grammar-de-adp-two-way-vor-acc",
	"grammar-de-adp-abbreviation-inkl",
	"grammar-de-adp-postposition-zuliebe-dat",
	"grammar-de-adp-preposition-seit-dat",
	"grammar-de-adp-citation-label-jenseits",
	"grammar-de-adp-mid-sentence-casing-typo-unter",
	"grammar-de-adp-lexical-typo-gegen",
	"grammar-de-adp-archaic-ob",
	"grammar-de-adp-repeated-second-bei",
	"grammar-de-adp-unresolved-sconj-weil",
	"grammar-de-adp-unresolved-verb-particle-auf",
	"grammar-de-adp-unresolved-fusion-im",
	"grammar-de-adp-unresolved-two-unrelated-targets",
	"grammar-de-adp-unresolved-target-includes-adverb",
	"grammar-de-adp-unresolved-adjective-route",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"ADP Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const adpositionGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateAdpositionGrammaticalResolution,
});
