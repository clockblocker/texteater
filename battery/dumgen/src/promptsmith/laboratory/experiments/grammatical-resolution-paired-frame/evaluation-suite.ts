import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/construction/paired-frame/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/construction/paired-frame/prompt-source";
import { evaluatePairedFrameGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-paired-frame-dev-entweder-freitag",
	"grammar-de-paired-frame-dev-entweder-clauses",
	"grammar-de-paired-frame-dev-weder-noch",
	"grammar-de-paired-frame-dev-sowohl-wie",
	"grammar-de-paired-frame-dev-sowohl-wie-auch",
	"grammar-de-paired-frame-dev-je-umso",
	"grammar-de-paired-frame-dev-um-zu",
	"grammar-de-paired-frame-dev-ohne-zu",
	"grammar-de-paired-frame-dev-statt-zu",
	"grammar-de-paired-frame-dev-teils-teils",
	"grammar-de-paired-frame-dev-je-je",
	"grammar-de-paired-frame-dev-casing-entweder",
	"grammar-de-paired-frame-dev-desto-typo",
	"grammar-de-paired-frame-dev-andererseits-typo",
	"grammar-de-paired-frame-dev-near-cconj",
	"grammar-de-paired-frame-dev-near-sconj",
	"grammar-de-paired-frame-dev-near-adv",
	"grammar-de-paired-frame-dev-repeated-um-zu-context",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-paired-frame-accept-entweder-nouns",
	"grammar-de-paired-frame-accept-weder-clauses",
	"grammar-de-paired-frame-accept-sowohl-als-auch",
	"grammar-de-paired-frame-accept-sowohl-wie",
	"grammar-de-paired-frame-accept-je-desto",
	"grammar-de-paired-frame-accept-je-umso",
	"grammar-de-paired-frame-accept-um-zu",
	"grammar-de-paired-frame-accept-einerseits",
	"grammar-de-paired-frame-accept-teils",
	"grammar-de-paired-frame-accept-ohne-zu",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`PairedFrame ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const pairedFrameGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluatePairedFrameGrammaticalResolution,
});

export const pairedFrameGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: acceptanceEvaluation,
		evaluator: evaluatePairedFrameGrammaticalResolution,
	});
