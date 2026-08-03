import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/adverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/adverb/prompt-source";
import { evaluateAdverbGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-adv-morgen",
	"grammar-de-adv-demonstrative-damit",
	"grammar-de-adv-comparative-oefter",
	"grammar-de-adv-demonstrative-dort",
	"grammar-de-adv-interrogative-warum",
	"grammar-de-adv-negative-keineswegs",
	"grammar-de-adv-multiplicative-zweimal",
	"grammar-de-adv-causal-deshalb",
	"grammar-de-adv-sentence-initial-vielleicht",
	"grammar-de-adv-typo-vielleich",
	"grammar-de-adv-unresolved-attributive-adjective",
	"grammar-de-adv-unresolved-modal-particle-doch",
	"grammar-de-adv-unresolved-subordinating-conjunction",
	"grammar-de-adv-unresolved-overbroad-target",
	"grammar-de-adv-unresolved-two-unrelated-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"ADV Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const adverbGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateAdverbGrammaticalResolution,
});
