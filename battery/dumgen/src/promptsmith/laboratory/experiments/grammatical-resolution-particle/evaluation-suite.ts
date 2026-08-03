import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/particle/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/particle/prompt-source";
import { evaluateParticleGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-part-negative-nicht",
	"grammar-de-part-negative-sentence-initial-nicht",
	"grammar-de-part-negative-typo-nicth",
	"grammar-de-part-infinitival-zu",
	"grammar-de-part-modal-doch",
	"grammar-de-part-modal-denn",
	"grammar-de-part-modal-wohl",
	"grammar-de-part-modal-bloss",
	"grammar-de-part-modal-mal",
	"grammar-de-part-modal-ja",
	"grammar-de-part-modal-label-eigentlich",
	"grammar-de-part-repeated-second-doch",
	"grammar-de-part-unresolved-verb-particle-an",
	"grammar-de-part-unresolved-adverb-gerne",
	"grammar-de-part-unresolved-response-ja",
	"grammar-de-part-unresolved-cconj-aber",
	"grammar-de-part-unresolved-sconj-weil",
	"grammar-de-part-unresolved-phraseme-na-ja",
	"grammar-de-part-unresolved-adposition-zu",
	"grammar-de-part-unresolved-overbroad-doch-mal",
	"grammar-de-part-unresolved-two-targets",
	"grammar-de-part-unresolved-ambiguous-doch-label",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PART Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const particleGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateParticleGrammaticalResolution,
});
