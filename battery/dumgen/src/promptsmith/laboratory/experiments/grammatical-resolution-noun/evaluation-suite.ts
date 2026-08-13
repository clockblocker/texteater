import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/noun/prompt-source";
import { evaluateNounGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-noun-dev-nom-plur-banken",
	"grammar-de-noun-dev-dat-sing-bibliothek",
	"grammar-de-noun-dev-gen-sing-mannes",
	"grammar-de-noun-dev-gen-plur-frauen",
	"grammar-de-noun-dev-vocative-leute",
	"grammar-de-noun-dev-acc-plur-buecher",
	"grammar-de-noun-dev-nom-sing-maedchen",
	"grammar-de-noun-dev-acc-sing-stadt",
	"grammar-de-noun-dev-dat-sing-chef",
	"grammar-de-noun-dev-nom-plur-eltern",
	"grammar-de-noun-dev-acc-plur-knie",
	"grammar-de-noun-dev-hyphenated-u-bahn",
	"grammar-de-noun-dev-variant-photographie",
	"grammar-de-noun-dev-lowercase-katze",
	"grammar-de-noun-dev-archaic-odem",
	"grammar-de-noun-dev-compound-haustuer",
	"grammar-de-noun-dev-substantivized-reisenden",
	"grammar-de-noun-dev-gen-sing-schule",
	"grammar-de-noun-dev-suspended-right-jugendbuecher",
	"grammar-de-noun-dev-suspended-hyphen-genitiv",
	"grammar-de-noun-dev-suspended-typo",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-noun-accept-nom-sing-mark",
	"grammar-de-noun-accept-nom-sing-tisch",
	"grammar-de-noun-accept-acc-sing-tuer",
	"grammar-de-noun-accept-dat-plur-haeusern",
	"grammar-de-noun-accept-gen-plur-kinder",
	"grammar-de-noun-accept-invariant-plur-maedchen",
	"grammar-de-noun-accept-plural-only-ferien",
	"grammar-de-noun-accept-hyphenated-e-mail",
	"grammar-de-noun-accept-substantivized-angestellten",
	"grammar-de-noun-accept-suspended-nonbreaking",
	"grammar-de-noun-accept-suspended-oder-singular",
	"grammar-de-noun-accept-suspended-dativ-plural",
	"grammar-de-noun-accept-suspended-nominativ-plural",
]);

if (
	!developmentEvaluation.isDisjointFrom(demonstrations) ||
	!acceptanceEvaluation.isDisjointFrom(demonstrations) ||
	!acceptanceEvaluation.isDisjointFrom(developmentEvaluation)
) {
	throw new Error(
		"NOUN demonstrations, development evaluation, and untouched acceptance evaluation must be pairwise disjoint.",
	);
}

export const evaluation = developmentEvaluation;

export const nounGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateNounGrammaticalResolution,
});

export const nounGrammaticalResolutionAcceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: acceptanceEvaluation,
	evaluator: evaluateNounGrammaticalResolution,
});
