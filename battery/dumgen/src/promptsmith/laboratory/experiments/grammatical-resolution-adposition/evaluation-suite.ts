import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/adposition/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { evaluateAdpositionGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-adp-dev-prep-durch-acc",
	"grammar-de-adp-dev-prep-zu-dat",
	"grammar-de-adp-dev-two-way-vor-acc",
	"grammar-de-adp-dev-post-zuliebe-dat",
	"grammar-de-adp-dev-prep-seit-dat",
	"grammar-de-adp-dev-wegen-local-dat-lexical-gen",
	"grammar-de-adp-dev-circ-um-willen",
	"grammar-de-adp-dev-circ-an-vorbei",
	"grammar-de-adp-dev-post-gegenueber-dat",
	"grammar-de-adp-dev-extpos-sconj-anstatt",
	"grammar-de-adp-dev-foreign-versus-acc",
	"grammar-de-adp-dev-prep-entlang-gen",
	"grammar-de-adp-dev-adp-before-unmarked-particle",
	"grammar-de-adp-dev-adp-beside-governed-verb-member",
	"grammar-de-adp-dev-adp-beside-fusion",
	"grammar-de-adp-dev-adp-beside-sconj",
	"grammar-de-adp-dev-sentence-initial-wegen",
	"grammar-de-adp-dev-casing-typo-unter",
	"grammar-de-adp-dev-lexical-typo-gegen",
	"grammar-de-adp-dev-abbreviation-inkl",
	"grammar-de-adp-dev-variant-auf-grund",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-adp-accept-prep-fuer-acc",
	"grammar-de-adp-accept-prep-aus-dat",
	"grammar-de-adp-accept-prep-waehrend-gen",
	"grammar-de-adp-accept-two-way-zwischen-dat",
	"grammar-de-adp-accept-post-wegen-gen",
	"grammar-de-adp-accept-circ-von-aus",
	"grammar-de-adp-accept-circ-ueber-hinaus",
	"grammar-de-adp-accept-post-gemaess-dat",
	"grammar-de-adp-accept-alternating-dank",
	"grammar-de-adp-accept-prep-bis-acc",
	"grammar-de-adp-accept-typo-ohhne",
	"grammar-de-adp-accept-archaic-behufs",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("ADP demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"ADP demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"ADP development and untouched acceptance must be disjoint.",
	);
}

export const evaluation = developmentEvaluation;

export const adpositionGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateAdpositionGrammaticalResolution,
});

export const adpositionGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateAdpositionGrammaticalResolution,
	});
