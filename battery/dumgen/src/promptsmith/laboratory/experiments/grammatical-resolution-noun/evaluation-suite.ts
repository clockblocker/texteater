import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/noun/prompt-source";
import { evaluateNounGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-noun-citation-haus",
	"grammar-de-noun-inflection-nom-plur-banken",
	"grammar-de-noun-inflection-acc-sing-hund",
	"grammar-de-noun-inflection-acc-plur-buecher",
	"grammar-de-noun-inflection-dat-plur-kindern",
	"grammar-de-noun-inflection-gen-sing-mannes",
	"grammar-de-noun-inflection-gen-plur-frauen",
	"grammar-de-noun-hyphenated-u-bahn",
	"grammar-de-noun-casing-typo-katze",
	"grammar-de-noun-archaic-odem",
	"grammar-de-noun-repeated-token-second-bank",
	"grammar-de-noun-unresolved-verb-route",
	"grammar-de-noun-unresolved-ambiguous-leiter",
	"grammar-de-noun-unresolved-overbroad-phrase",
	"grammar-de-noun-unresolved-two-unrelated-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"NOUN Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const nounGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateNounGrammaticalResolution,
});
