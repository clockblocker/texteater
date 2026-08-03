import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/proper-noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/proper-noun/prompt-source";
import { evaluateProperNounGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-propn-acc-sing-anna",
	"grammar-de-propn-dat-sing-berlin",
	"grammar-de-propn-nom-sing-deutschland",
	"grammar-de-propn-acc-sing-schweiz",
	"grammar-de-propn-gen-sing-peters",
	"grammar-de-propn-gen-sing-deutschlands",
	"grammar-de-propn-gen-sing-hans-apostrophe",
	"grammar-de-propn-vocative-anna",
	"grammar-de-propn-dat-plur-niederlanden",
	"grammar-de-propn-citation-hamburg",
	"grammar-de-propn-typo-muenchn",
	"grammar-de-propn-canonical-acronym-nato",
	"grammar-de-propn-unresolved-common-noun-stadt",
	"grammar-de-propn-unresolved-adjective-schnell",
	"grammar-de-propn-unresolved-numeral-2024",
	"grammar-de-propn-unresolved-verb-reisen",
	"grammar-de-propn-unresolved-repeated-peter",
	"grammar-de-propn-unresolved-unrelated-anna-berlin",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"PROPN Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const properNounGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateProperNounGrammaticalResolution,
});
