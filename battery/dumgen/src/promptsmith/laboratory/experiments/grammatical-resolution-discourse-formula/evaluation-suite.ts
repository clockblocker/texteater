import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/phraseme/discourse-formula/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/phraseme/discourse-formula/prompt-source";
import { evaluateDiscourseFormulaGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-discourse-formula-auf-wiedersehen",
	"grammar-de-discourse-formula-vielen-dank",
	"grammar-de-discourse-formula-gern-geschehen",
	"grammar-de-discourse-formula-nein-danke",
	"grammar-de-discourse-formula-ach-du-meine-guete",
	"grammar-de-discourse-formula-darf-ich-bitten",
	"grammar-de-discourse-formula-dann-wollen-wir-mal",
	"grammar-de-discourse-formula-bis-bald",
	"grammar-de-discourse-formula-besten-dank",
	"grammar-de-discourse-formula-herzlich-wilkommen-typo",
	"grammar-de-discourse-formula-unresolved-compositional-request",
	"grammar-de-discourse-formula-unresolved-collocation",
	"grammar-de-discourse-formula-unresolved-idiom",
	"grammar-de-discourse-formula-unresolved-proverb",
	"grammar-de-discourse-formula-unresolved-arbitrary-quote",
	"grammar-de-discourse-formula-unresolved-partial-formula",
	"grammar-de-discourse-formula-unresolved-compositional-gute-reise-np",
	"grammar-de-discourse-formula-unresolved-repeated-occurrence",
	"grammar-de-discourse-formula-unresolved-unrelated-targets",
	"grammar-de-discourse-formula-unresolved-bitte-intj",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"DiscourseFormula Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const discourseFormulaGrammaticalResolutionExperiment = defineExperiment(
	{
		promptSource,
		evaluation,
		evaluator: evaluateDiscourseFormulaGrammaticalResolution,
	},
);
