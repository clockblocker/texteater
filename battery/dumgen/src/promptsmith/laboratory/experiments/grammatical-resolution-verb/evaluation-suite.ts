import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/lexeme/verb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/lexeme/verb/prompt-source";
import { evaluateVerbGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-verb-dw-perfect-etabliert",
	"grammar-de-verb-dw-perfect-eingependelt",
	"grammar-de-verb-dw-perfect-ausgeschlossen",
	"grammar-de-verb-dw-separable-nachwirken",
	"grammar-de-verb-dw-passive-weitergeleitet",
	"grammar-de-verb-dw-future-finden",
	"grammar-de-verb-dw-pluperfect-angekuendigt",
	"grammar-de-verb-dw-passive-aufgefressen",
	"grammar-de-verb-dw-perfect-ausgesprochen",
	"grammar-de-verb-dw-pluperfect-passive-verschifft",
	"grammar-de-verb-dw-separable-vorbereiten",
	"grammar-de-verb-finite-liest",
	"grammar-de-verb-past-ging",
	"grammar-de-verb-typo-tanzd",
	"grammar-de-verb-full-modal-mag",
	"grammar-de-verb-prep-governed-warten-auf",
	"grammar-de-verb-prep-free-warten-im",
	"grammar-de-verb-prep-governed-verzichten-auf",
	"grammar-de-verb-prep-free-sprechen-im",
	"grammar-de-verb-prep-governed-reflexive-erinnern-an",
	"grammar-de-verb-prep-governed-reflexive-sehnen-nach",
	"grammar-de-verb-prep-free-reflexive-erholen-im",
	"grammar-de-verb-prep-governed-warnen-vor",
	"grammar-de-verb-prep-free-arbeiten-mit",
	"grammar-de-verb-prep-free-spielen-auf",
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
