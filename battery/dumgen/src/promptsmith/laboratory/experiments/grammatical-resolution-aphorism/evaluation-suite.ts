import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/phraseme/aphorism/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/phraseme/aphorism/prompt-source";
import { evaluateAphorismGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-aphorism-nachahmer",
	"grammar-de-aphorism-nachsicht",
	"grammar-de-aphorism-kindheit",
	"grammar-de-aphorism-alter",
	"grammar-de-aphorism-jugend",
	"grammar-de-aphorism-tadel",
	"grammar-de-aphorism-liebe-rechte",
	"grammar-de-aphorism-gegenwart",
	"grammar-de-aphorism-streiten",
	"grammar-de-aphorism-unbezahlbar",
	"grammar-de-aphorism-grundsaetze",
	"grammar-de-aphorism-casing-menschen",
	"grammar-de-aphorism-unresolved-idiom",
	"grammar-de-aphorism-unresolved-collocation",
	"grammar-de-aphorism-unresolved-arbitrary-quotation",
	"grammar-de-aphorism-unresolved-ordinary-sentence",
	"grammar-de-aphorism-unresolved-literary-quotation",
	"grammar-de-aphorism-unresolved-partial",
	"grammar-de-aphorism-unresolved-two-whole-units",
	"grammar-de-aphorism-unresolved-proverb-grube",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"Aphorism Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const aphorismGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateAphorismGrammaticalResolution,
});
