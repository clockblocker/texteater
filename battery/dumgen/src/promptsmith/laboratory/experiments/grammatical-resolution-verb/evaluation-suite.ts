import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/verb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/verb/prompt-source";
import { evaluateVerbGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-verb-past-ging",
	"grammar-de-verb-imperative-lauf",
	"grammar-de-verb-infinitive-hinauszulaufen",
	"grammar-de-verb-participle-mitgebracht",
	"grammar-de-verb-participle-gesungen",
	"grammar-de-verb-governed-preposition-wartet",
	"grammar-de-verb-separable-finite-aufstehen",
	"grammar-de-verb-reflexive-schaemt",
	"grammar-de-verb-full-modal-mag",
	"grammar-de-verb-full-werden",
	"grammar-de-verb-full-hat",
	"grammar-de-verb-typo-tanzd",
	"grammar-de-verb-unresolved-perfect-aux-hat",
	"grammar-de-verb-unresolved-modal-aux-kann",
	"grammar-de-verb-unresolved-attributive-participle",
	"grammar-de-verb-unresolved-overbroad-aux-participle",
	"grammar-de-verb-unresolved-overbroad-reflexive",
	"grammar-de-verb-unresolved-overbroad-governed-preposition",
	"grammar-de-verb-unresolved-repeated-schlaeft",
	"grammar-de-verb-unresolved-unrelated-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"VERB Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const verbGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateVerbGrammaticalResolution,
});
