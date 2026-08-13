import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/other/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/other/prompt-source";
import { evaluateOtherGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-x-dev-unknown-blarg-nom",
	"grammar-de-x-dev-unknown-glorps-acc",
	"grammar-de-x-dev-unknown-glorpen-inf",
	"grammar-de-x-dev-unknown-glorpt-fin",
	"grammar-de-x-dev-unknown-geglorpt-part",
	"grammar-de-x-dev-unknown-glorp-imp",
	"grammar-de-x-dev-foreign-anyway",
	"grammar-de-x-dev-foreign-low-key",
	"grammar-de-x-dev-slang-cringe",
	"grammar-de-x-dev-slang-sus",
	"grammar-de-x-dev-casing-whatever",
	"grammar-de-x-dev-archaic-thou",
	"grammar-de-x-dev-variant-colour",
	"grammar-de-x-dev-mixed-w00t",
	"grammar-de-x-dev-repeated-whatever",
	"grammar-de-x-dev-near-opaque-foobar",
	"grammar-de-x-dev-near-known-routes-yeet",
	"grammar-de-x-dev-alphanumeric-3d",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-x-accept-v2-unknown-quend",
	"grammar-de-x-accept-v2-unknown-zarg-nom-masc",
	"grammar-de-x-accept-v2-unknown-zorps-gen",
	"grammar-de-x-accept-v2-unknown-nerge-sub",
	"grammar-de-x-accept-v2-foreign-random",
	"grammar-de-x-accept-v2-abbr-tbh",
	"grammar-de-x-accept-v2-fragment-trans",
	"grammar-de-x-accept-v2-hyphen-off-grid",
	"grammar-de-x-accept-v2-typo-wierd",
	"grammar-de-x-accept-v2-archaic-hither",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`X ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const otherGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateOtherGrammaticalResolution,
});

export const otherGrammaticalResolutionAcceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: acceptanceEvaluation,
	evaluator: evaluateOtherGrammaticalResolution,
});
