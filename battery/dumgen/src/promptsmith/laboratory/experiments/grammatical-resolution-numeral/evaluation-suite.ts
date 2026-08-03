import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/numeral/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/numeral/prompt-source";
import { evaluateNumeralGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-num-sentence-initial-fuenf",
	"grammar-de-num-digit-42",
	"grammar-de-num-roman-ix",
	"grammar-de-num-year-2024",
	"grammar-de-num-anderthalb",
	"grammar-de-num-citation-hundert",
	"grammar-de-num-unresolved-determiner-beide",
	"grammar-de-num-unresolved-adverb-dreimal",
	"grammar-de-num-unresolved-ordinal-zweiten",
	"grammar-de-num-unresolved-proper-name-ii",
	"grammar-de-num-unresolved-symbol-percent",
	"grammar-de-num-unresolved-multi-token-sechs-billionen",
	"grammar-de-num-unresolved-repeated-acht",
	"grammar-de-num-unresolved-two-unrelated-targets",
	"grammar-de-num-unresolved-adjective-60er",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"NUM Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const numeralGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateNumeralGrammaticalResolution,
});
