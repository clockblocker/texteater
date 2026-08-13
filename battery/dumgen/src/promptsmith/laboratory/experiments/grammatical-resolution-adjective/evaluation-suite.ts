import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/lexeme/adjective/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/lexeme/adjective/prompt-source";
import { evaluateAdjectiveGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-adj-dev-attributive-acc-fem-rot",
	"grammar-de-adj-dev-attributive-dat-neut-kalt",
	"grammar-de-adj-dev-attributive-gen-plur-neu",
	"grammar-de-adj-dev-attributive-nom-plur-alt",
	"grammar-de-adj-dev-predicative-blau",
	"grammar-de-adj-dev-adverbial-leise",
	"grammar-de-adj-dev-attributive-comparative-teuer",
	"grammar-de-adj-dev-attributive-superlative-hoch",
	"grammar-de-adj-dev-adverbial-superlative-sorgfaeltig",
	"grammar-de-adj-dev-predicative-comparative-nah",
	"grammar-de-adj-dev-cardinal-siebenhundert",
	"grammar-de-adj-dev-foreign-special",
	"grammar-de-adj-dev-abbreviation-sog",
	"grammar-de-adj-dev-typo-grsser",
	"grammar-de-adj-dev-participial-geschlossen",
	"grammar-de-adj-dev-participial-spannend",
	"grammar-de-adj-dev-invariant-lila",
	"grammar-de-adj-dev-archaic-hold",
]);

export const untouchedAcceptanceEvaluation = corpus.select([
	"grammar-de-adj-accept-citation-mild",
	"grammar-de-adj-accept-attributive-dat-fem-lang",
	"grammar-de-adj-accept-attributive-acc-neut-gruen",
	"grammar-de-adj-accept-attributive-gen-masc-stark",
	"grammar-de-adj-accept-predicative-ruhig",
	"grammar-de-adj-accept-adverbial-deutlich",
	"grammar-de-adj-accept-irregular-superlative-beste",
	"grammar-de-adj-accept-adverbial-comparative-schnell",
	"grammar-de-adj-accept-ordinal-zweite",
	"grammar-de-adj-accept-typo-wunderschoen",
	"grammar-de-adj-accept-participial-glaenzend",
	"grammar-de-adj-accept-invariant-rosa",
]);

if (!developmentEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error("ADJ demonstrations and development must be disjoint.");
}
if (!untouchedAcceptanceEvaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"ADJ demonstrations and untouched acceptance must be disjoint.",
	);
}
if (!developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation)) {
	throw new Error(
		"ADJ development and untouched acceptance must be disjoint.",
	);
}

export const adjectiveGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateAdjectiveGrammaticalResolution,
});

export const adjectiveGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: untouchedAcceptanceEvaluation,
		evaluator: evaluateAdjectiveGrammaticalResolution,
	});
