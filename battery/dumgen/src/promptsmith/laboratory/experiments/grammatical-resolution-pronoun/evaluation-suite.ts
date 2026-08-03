import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { evaluatePronounGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-pron-sentence-initial-es",
	"grammar-de-pron-personal-feminine-sie",
	"grammar-de-pron-personal-plural-sie",
	"grammar-de-pron-personal-wir",
	"grammar-de-pron-formal-sie",
	"grammar-de-pron-formal-ihnen",
	"grammar-de-pron-reflexive-sich",
	"grammar-de-pron-nonreflexive-mich",
	"grammar-de-pron-reflexive-mich",
	"grammar-de-pron-indefinite-jemanden",
	"grammar-de-pron-indefinite-etwas",
	"grammar-de-pron-negative-niemandem",
	"grammar-de-pron-negative-nichts",
	"grammar-de-pron-reciprocal-einander",
	"grammar-de-pron-variant-nix",
	"grammar-de-pron-typo-ihc",
	"grammar-de-pron-unresolved-adverb-etwas",
	"grammar-de-pron-unresolved-nominalized-ich",
	"grammar-de-pron-unresolved-overbroad-mit-ihm",
	"grammar-de-pron-unresolved-repeated-sie",
	"grammar-de-pron-unresolved-unrelated-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PRON Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const pronounGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluatePronounGrammaticalResolution,
});
