import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/verb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/verb/prompt-source";
import { evaluateVerbGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-verb-infinitive-hinauszulaufen",
	"grammar-de-verb-participle-mitgebracht",
	"grammar-de-verb-participle-gesungen",
	"grammar-de-verb-governed-preposition-wartet",
	"grammar-de-verb-separable-finite-aufstehen",
	"grammar-de-verb-reflexive-schaemt",
	"grammar-de-verb-future-wird-reisen",
	"grammar-de-verb-passive-wurde-gebeten",
	"grammar-de-verb-full-werden",
	"grammar-de-verb-full-hat",
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
