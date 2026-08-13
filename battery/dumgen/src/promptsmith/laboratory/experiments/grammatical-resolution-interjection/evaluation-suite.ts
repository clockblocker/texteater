import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/interjection/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/interjection/prompt-source";
import { evaluateInterjectionGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-intj-dev-wupp-onomatopoeia",
	"grammar-de-intj-dev-hallo-greeting",
	"grammar-de-intj-dev-hurra-joy",
	"grammar-de-intj-dev-oh-reaction",
	"grammar-de-intj-dev-huch-surprise",
	"grammar-de-intj-dev-au-pain",
	"grammar-de-intj-dev-aeh-hesitation",
	"grammar-de-intj-dev-tja-resignation",
	"grammar-de-intj-dev-miau-onomatopoeia",
	"grammar-de-intj-dev-nein-response",
	"grammar-de-intj-dev-doch-corrective-response",
	"grammar-de-intj-dev-jawohl-response",
	"grammar-de-intj-dev-initial-ach",
	"grammar-de-intj-dev-lengthened-boahhh",
	"grammar-de-intj-dev-reduplicated-he-he",
	"grammar-de-intj-dev-typo-pufi",
	"grammar-de-intj-dev-archaic-potz",
	"grammar-de-intj-dev-acronym-omg",
	"grammar-de-intj-dev-beside-part-ja",
	"grammar-de-intj-dev-beside-discourse-formula-oh",
	"grammar-de-intj-dev-beside-adv-na",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-intj-accept-v2-aha-realization",
	"grammar-de-intj-accept-v2-hoppla-mishap",
	"grammar-de-intj-accept-v2-maeh-onomatopoeia",
	"grammar-de-intj-accept-v2-ja-response-initial",
	"grammar-de-intj-accept-v2-heda-prompting",
	"grammar-de-intj-accept-v2-secondary-mann",
	"grammar-de-intj-accept-v2-secondary-donnerwetter",
	"grammar-de-intj-accept-v2-lengthened-aaach",
	"grammar-de-intj-accept-v2-reduplicated-igitt-igitt",
	"grammar-de-intj-accept-v2-typo-halol",
	"grammar-de-intj-accept-v2-acronym-lol",
	"grammar-de-intj-accept-v2-lengthened-ohhh",
	"grammar-de-intj-accept-v2-ordinary-lexical-mist",
	"grammar-de-intj-accept-v2-beside-formula-aehm",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("INTJ demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"INTJ demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error("INTJ development and acceptance must be disjoint.");
}

export const evaluation = developmentEvaluation;

export const interjectionGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateInterjectionGrammaticalResolution,
});

export const interjectionGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateInterjectionGrammaticalResolution,
	});
