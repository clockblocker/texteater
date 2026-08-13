import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/auxiliary/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import { evaluateAuxiliaryGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-aux-dev-perfect-hat-gegessen",
	"grammar-de-aux-dev-perfect-waren-gegangen",
	"grammar-de-aux-dev-passive-wird-repariert",
	"grammar-de-aux-dev-passive-wurde-gesperrt",
	"grammar-de-aux-dev-copula-bin-muede",
	"grammar-de-aux-dev-subjunctive-sei-gegangen",
	"grammar-de-aux-dev-subjunctive-waeren-geblieben",
	"grammar-de-aux-dev-modal-darf-bleiben",
	"grammar-de-aux-dev-modal-wolltest-gehen",
	"grammar-de-aux-dev-modal-moechte-bleiben",
	"grammar-de-aux-dev-modal-sollen-syncretic",
	"grammar-de-aux-dev-infinitive-sein",
	"grammar-de-aux-dev-infinitive-passive-werden",
	"grammar-de-aux-dev-participle-gewesen",
	"grammar-de-aux-dev-participle-worden",
	"grammar-de-aux-dev-typo-mus",
	"grammar-de-aux-dev-variant-muss",
	"grammar-de-aux-dev-contrast-modal-mag",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-aux-accept-perfect-ist-gegangen",
	"grammar-de-aux-accept-future-werden-abreisen",
	"grammar-de-aux-accept-passive-wurden-gerufen",
	"grammar-de-aux-accept-copula-war-ruhig",
	"grammar-de-aux-accept-subjunctive-haette",
	"grammar-de-aux-accept-modal-muessen",
	"grammar-de-aux-accept-modal-mag",
	"grammar-de-aux-accept-modal-wollt",
	"grammar-de-aux-accept-citation-sein",
	"grammar-de-aux-accept-infinitive-haben",
	"grammar-de-aux-accept-typo-koenen",
	"grammar-de-aux-accept-archaic-ward",
]);

if (!demonstrations.isDisjointFrom(developmentEvaluation)) {
	throw new Error(
		"AUX demonstrations and development evaluation must be disjoint.",
	);
}
if (!demonstrations.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"AUX demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"AUX development and untouched acceptance must be disjoint.",
	);
}

export const auxiliaryGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateAuxiliaryGrammaticalResolution,
});

export const auxiliaryGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateAuxiliaryGrammaticalResolution,
	});
