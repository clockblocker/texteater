import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import { evaluateCoordinatingConjunctionGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-cconj-citation-oder",
	"grammar-de-cconj-und-noun-phrases",
	"grammar-de-cconj-oder-clauses",
	"grammar-de-cconj-aber-clauses",
	"grammar-de-cconj-denn-clauses",
	"grammar-de-cconj-coordinating-doch",
	"grammar-de-cconj-sondern-adjectives",
	"grammar-de-cconj-sowie-noun-phrases",
	"grammar-de-cconj-correlative-noch",
	"grammar-de-cconj-repeated-second-und",
	"grammar-de-cconj-sentence-initial-und",
	"grammar-de-cconj-comparative-wie",
	"grammar-de-cconj-typo-odre",
	"grammar-de-cconj-unresolved-ambiguous-denn",
	"grammar-de-cconj-unresolved-subordinator-weil",
	"grammar-de-cconj-unresolved-overbroad-und-kaffee",
	"grammar-de-cconj-unresolved-two-targets",
	"grammar-de-cconj-unresolved-particle-aber",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"CCONJ Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const coordinatingConjunctionGrammaticalResolutionExperiment =
	defineExperiment({
		promptSource,
		evaluation,
		evaluator: evaluateCoordinatingConjunctionGrammaticalResolution,
	});
