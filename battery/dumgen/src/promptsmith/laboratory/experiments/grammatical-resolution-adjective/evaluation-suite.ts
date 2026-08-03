import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/adjective/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/adjective/prompt-source";
import { evaluateAdjectiveGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-adj-attributive-acc-fem-rot",
	"grammar-de-adj-attributive-dat-neut-kalt",
	"grammar-de-adj-attributive-gen-plur-neu",
	"grammar-de-adj-predicative-blau",
	"grammar-de-adj-adverbial-leise",
	"grammar-de-adj-participial-geschlossen",
	"grammar-de-adj-irregular-comparative-besser",
	"grammar-de-adj-attributive-comparative-teuer",
	"grammar-de-adj-attributive-superlative-hoch",
	"grammar-de-adj-adverbial-superlative-sorgfaeltig",
	"grammar-de-adj-ordinal-erste",
	"grammar-de-adj-typo-grsser",
	"grammar-de-adj-unresolved-lexical-adverb",
	"grammar-de-adj-unresolved-perfect-participle",
	"grammar-de-adj-unresolved-overbroad-modifier",
	"grammar-de-adj-unresolved-repeated-surfaces",
	"grammar-de-adj-unresolved-unrelated-targets",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"ADJ Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const adjectiveGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateAdjectiveGrammaticalResolution,
});
