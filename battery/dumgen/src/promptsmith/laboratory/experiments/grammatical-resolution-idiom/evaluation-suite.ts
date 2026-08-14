import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/phraseme/idiom/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/phraseme/idiom/prompt-source";
import { evaluateIdiomGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-idiom-faeustchen-perfect-full",
	"grammar-de-idiom-truebsal-imperative-full",
	"grammar-de-idiom-hand-fuss-subjunctive-full",
	"grammar-de-idiom-schneider-past-full",
	"grammar-de-idiom-fliegen-present-full",
	"grammar-de-idiom-loeffel-typo-full",
	"grammar-de-idiom-kalte-schulter-future-full",
	"grammar-de-idiom-fettnaepfchen-infinitive-full",
	"grammar-de-idiom-tomaten-present-full",
	"grammar-de-idiom-nagel-passive-full",
	"grammar-de-idiom-zunge-im-zaum-infinitive-full",
	"grammar-de-idiom-dick-duenn-past-full",
	"grammar-de-idiom-faden-perfect-full",
	"grammar-de-idiom-ohr-present-full",
	"grammar-de-idiom-kuerzeren-ellipsis-partial",
	"grammar-de-idiom-bett-literal-figurative-full",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-idiom-wolke-present-full",
	"grammar-de-idiom-wolken-past-full",
	"grammar-de-idiom-katze-perfect-full",
	"grammar-de-idiom-kirche-imperative-full",
	"grammar-de-idiom-blatt-future-full",
	"grammar-de-idiom-kopf-sand-typo-perfect",
	"grammar-de-idiom-licht-passive-full",
	"grammar-de-idiom-haende-present-full",
	"grammar-de-idiom-schlauch-present-full",
	"grammar-de-idiom-segel-ellipsis-partial",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`Idiom ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const idiomGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateIdiomGrammaticalResolution,
});

export const idiomGrammaticalResolutionAcceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: acceptanceEvaluation,
	evaluator: evaluateIdiomGrammaticalResolution,
});
