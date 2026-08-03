import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/phraseme/idiom/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/phraseme/idiom/prompt-source";
import { evaluateIdiomGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-idiom-faeustchen-past-full",
	"grammar-de-idiom-faeustchen-participle-full",
	"grammar-de-idiom-faeustchen-infinitive-full",
	"grammar-de-idiom-faeustchen-typo",
	"grammar-de-idiom-truebsal-imperative-full",
	"grammar-de-idiom-hand-fuss-present-full",
	"grammar-de-idiom-hand-fuss-subjunctive-full",
	"grammar-de-idiom-schneider-past-full",
	"grammar-de-idiom-schneider-citation",
	"grammar-de-idiom-bett-past-full",
	"grammar-de-idiom-fliegen-present-full",
	"grammar-de-idiom-fliegen-participle-full",
	"grammar-de-idiom-loeffel-past-full",
	"grammar-de-idiom-loeffel-typo",
	"grammar-de-idiom-unresolved-underselected-without-head",
	"grammar-de-idiom-unresolved-overselected-subject",
	"grammar-de-idiom-unresolved-literal-bed",
	"grammar-de-idiom-unresolved-collocation",
	"grammar-de-idiom-unresolved-proverb",
	"grammar-de-idiom-unresolved-discourse-formula",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"Idiom Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const idiomGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateIdiomGrammaticalResolution,
});
