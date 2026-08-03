import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/symbol/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/symbol/prompt-source";
import { evaluateSymbolGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-sym-equals-equation",
	"grammar-de-sym-slash-per",
	"grammar-de-sym-plus-operator",
	"grammar-de-sym-ampersand-symbolic-coordinator",
	"grammar-de-sym-euro-currency",
	"grammar-de-sym-degree-unit",
	"grammar-de-sym-asterisk-birth",
	"grammar-de-sym-emoticon-smile",
	"grammar-de-sym-emoji-smile",
	"grammar-de-sym-hashtag-sign",
	"grammar-de-sym-letter-x-multiplication",
	"grammar-de-sym-middle-dot-dative",
	"grammar-de-sym-unresolved-numeral-seven",
	"grammar-de-sym-unresolved-noun-prozent",
	"grammar-de-sym-unresolved-proper-name-plus",
	"grammar-de-sym-unresolved-function-word-und",
	"grammar-de-sym-unresolved-overbroad-emoji-punctuation",
	"grammar-de-sym-unresolved-two-symbol-occurrences",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"SYM Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const symbolGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateSymbolGrammaticalResolution,
});
