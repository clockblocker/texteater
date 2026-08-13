import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import { evaluateCoordinatingConjunctionGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-cconj-dev-ordinary-oder-nouns",
	"grammar-de-cconj-dev-adversative-aber-clauses",
	"grammar-de-cconj-dev-adversative-doch-clauses",
	"grammar-de-cconj-dev-corrective-sondern",
	"grammar-de-cconj-dev-additive-sowie",
	"grammar-de-cconj-dev-beziehungsweise-full",
	"grammar-de-cconj-dev-sentence-initial-und",
	"grammar-de-cconj-dev-repeated-second-und",
	"grammar-de-cconj-dev-comparative-wie",
	"grammar-de-cconj-dev-comparative-als-mehr",
	"grammar-de-cconj-dev-jedoch-null-position",
	"grammar-de-cconj-dev-aber-not-particle",
	"grammar-de-cconj-dev-doch-not-particle",
	"grammar-de-cconj-dev-denn-verb-second-anchor",
	"grammar-de-cconj-dev-oder-without-paired-frame",
	"grammar-de-cconj-dev-typo-odre",
	"grammar-de-cconj-dev-typo-sonedrn",
	"grammar-de-cconj-dev-variant-bzw-initial",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-cconj-accept-und-list",
	"grammar-de-cconj-accept-oder-clauses",
	"grammar-de-cconj-accept-aber-adjectives",
	"grammar-de-cconj-accept-sowie-subjects",
	"grammar-de-cconj-accept-variant-u",
	"grammar-de-cconj-accept-comparative-als-tiefer",
	"grammar-de-cconj-accept-comparative-wie-ebenso",
	"grammar-de-cconj-accept-denn-causal",
	"grammar-de-cconj-accept-doch-sentence-initial",
	"grammar-de-cconj-accept-jedoch-null-position",
	"grammar-de-cconj-accept-typo-jedcoh",
	"grammar-de-cconj-accept-archaic-allein",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"CCONJ demonstrations and development evaluation must be disjoint.",
	);
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"CCONJ demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"CCONJ development and untouched acceptance must be disjoint.",
	);
}

export const coordinatingConjunctionGrammaticalResolutionExperiment =
	defineExperiment({
		promptSource,
		evaluation: developmentEvaluation,
		evaluator: evaluateCoordinatingConjunctionGrammaticalResolution,
	});

export const coordinatingConjunctionGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateCoordinatingConjunctionGrammaticalResolution,
	});
