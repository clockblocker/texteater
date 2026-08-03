import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/determiner/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/determiner/prompt-source";
import { evaluateDeterminerGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-det-indefinite-article-einen",
	"grammar-de-det-demonstrative-diesem",
	"grammar-de-det-interrogative-welchen",
	"grammar-de-det-negative-kein",
	"grammar-de-det-total-alle",
	"grammar-de-det-total-beide-cardinal",
	"grammar-de-det-possessive-deinen",
	"grammar-de-det-possessive-unserem",
	"grammar-de-det-possessive-seinen",
	"grammar-de-det-formal-possessive-ihrem",
	"grammar-de-det-citation-jeglicher",
	"grammar-de-det-typo-keien",
	"grammar-de-det-repeated-second-einem",
	"grammar-de-det-unresolved-personal-pronoun-er",
	"grammar-de-det-unresolved-interrogative-pronoun-wer",
	"grammar-de-det-unresolved-numeral-eins",
	"grammar-de-det-unresolved-two-unrelated-targets",
	"grammar-de-det-unresolved-repeated-same-lemma-dieser",
	"grammar-de-det-unresolved-fusion-im",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"DET Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const determinerGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateDeterminerGrammaticalResolution,
});
