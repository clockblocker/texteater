import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/phraseme/aphorism/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/phraseme/aphorism/prompt-source";
import { evaluateAphorismGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-aphorism-nachahmer",
	"grammar-de-aphorism-nachsicht",
	"grammar-de-aphorism-kindheit",
	"grammar-de-aphorism-alter",
	"grammar-de-aphorism-jugend",
	"grammar-de-aphorism-tadel",
	"grammar-de-aphorism-gegenwart",
	"grammar-de-aphorism-streiten",
	"grammar-de-aphorism-unbezahlbar",
	"grammar-de-aphorism-grundsaetze",
	"grammar-de-aphorism-casing-menschen",
	"grammar-de-aphorism-aphorismus-ring",
	"grammar-de-aphorism-selbstverstaendlich",
	"grammar-de-aphorism-sichtbare-schoenheit",
	"grammar-de-aphorism-geduld-streitsucht",
	"grammar-de-aphorism-weise-gut",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-aphorism-warten",
	"grammar-de-aphorism-leidenschaft",
	"grammar-de-aphorism-gebrannte-kinder",
	"grammar-de-aphorism-mitleid-neglige",
	"grammar-de-aphorism-arme-reiche",
	"grammar-de-aphorism-widerspruch-partial",
	"grammar-de-aphorism-huete-dich",
	"grammar-de-aphorism-alten-lesen",
	"grammar-de-aphorism-kunst-tempel-partial",
	"grammar-de-aphorism-guete-grenzenlos",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`Aphorism ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const aphorismGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateAphorismGrammaticalResolution,
});

export const aphorismGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: acceptanceEvaluation,
		evaluator: evaluateAphorismGrammaticalResolution,
	});
