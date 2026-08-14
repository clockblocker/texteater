import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/phraseme/discourse-formula/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/phraseme/discourse-formula/prompt-source";
import { evaluateDiscourseFormulaGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-discourse-formula-dev-auf-wiedersehen",
	"grammar-de-discourse-formula-dev-gern-geschehen",
	"grammar-de-discourse-formula-dev-nein-danke",
	"grammar-de-discourse-formula-dev-darf-ich-bitten",
	"grammar-de-discourse-formula-dev-dann-wollen-wir-mal",
	"grammar-de-discourse-formula-dev-wie-dem-auch-sei",
	"grammar-de-discourse-formula-dev-herzlich-willkommen",
	"grammar-de-discourse-formula-dev-bitte-schoen-presentation",
	"grammar-de-discourse-formula-dev-bitte-schoen-request",
	"grammar-de-discourse-formula-dev-tut-mir-leid-sympathy",
	"grammar-de-discourse-formula-dev-herzlichen-glueckwunsch",
	"grammar-de-discourse-formula-dev-danke-danke-repetition",
	"grammar-de-discourse-formula-dev-guten-morgen-casing-typo",
	"grammar-de-discourse-formula-dev-herzlich-wilkommen-typo",
	"grammar-de-discourse-formula-dev-auf-wiedersehn-variant",
	"grammar-de-discourse-formula-dev-gott-befohlen-archaic",
	"grammar-de-discourse-formula-dev-mit-freundlichen-partial",
	"grammar-de-discourse-formula-dev-gute-reise-wish",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-discourse-formula-accept-schoenen-guten-tag",
	"grammar-de-discourse-formula-accept-gute-nacht",
	"grammar-de-discourse-formula-accept-besten-dank",
	"grammar-de-discourse-formula-accept-ich-bitte-um-verzeihung",
	"grammar-de-discourse-formula-accept-keine-ursache",
	"grammar-de-discourse-formula-accept-vielen-herzlichen-partial",
	"grammar-de-discourse-formula-accept-auf-keinen-fall",
	"grammar-de-discourse-formula-accept-nun-denn",
	"grammar-de-discourse-formula-accept-um-himmels-willen",
	"grammar-de-discourse-formula-accept-willkommen-single",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`DiscourseFormula ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const discourseFormulaGrammaticalResolutionExperiment = defineExperiment(
	{
		promptSource,
		evaluation: developmentEvaluation,
		evaluator: evaluateDiscourseFormulaGrammaticalResolution,
	},
);

export const discourseFormulaGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: acceptanceEvaluation,
		evaluator: evaluateDiscourseFormulaGrammaticalResolution,
	});
