import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/auxiliary/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import { evaluateAuxiliaryGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-aux-perfect-ist-gegangen",
	"grammar-de-aux-perfect-hat-gegessen",
	"grammar-de-aux-copula-ist-alt",
	"grammar-de-aux-perfect-waren-gegangen",
	"grammar-de-aux-subjunctive-waeren-gekommen",
	"grammar-de-aux-participle-gewesen",
	"grammar-de-aux-copular-imperative-sei",
	"grammar-de-aux-infinitive-sein",
	"grammar-de-aux-modal-will-gehen",
	"grammar-de-aux-modal-wollt-gehen",
	"grammar-de-aux-modal-musste-gehen",
	"grammar-de-aux-modal-muessen-plural",
	"grammar-de-aux-modal-wollen-citation",
	"grammar-de-aux-typo-mus",
	"grammar-de-aux-sentence-initial-wollen",
	"grammar-de-aux-repeated-second-mag",
	"grammar-de-aux-unresolved-full-verb-hat",
	"grammar-de-aux-unresolved-full-verb-mag",
	"grammar-de-aux-unresolved-overbroad-will-gehen",
	"grammar-de-aux-unresolved-two-unrelated-targets",
	"grammar-de-aux-unresolved-repeated-same-lemma",
	"grammar-de-aux-unresolved-particle-zu",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"AUX Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const auxiliaryGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateAuxiliaryGrammaticalResolution,
});
