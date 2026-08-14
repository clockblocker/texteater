import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/phraseme/proverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/phraseme/proverb/prompt-source";
import { evaluateProverbGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-proverb-dev-andere-laender",
	"grammar-de-proverb-dev-ende-gut",
	"grammar-de-proverb-dev-uebung-meister",
	"grammar-de-proverb-dev-viele-koeche",
	"grammar-de-proverb-dev-grube",
	"grammar-de-proverb-dev-zuletzt-lacht",
	"grammar-de-proverb-dev-stille-wasser",
	"grammar-de-proverb-dev-gelegenheit-diebe",
	"grammar-de-proverb-dev-apfel-stamm",
	"grammar-de-proverb-dev-kleinvieh",
	"grammar-de-proverb-dev-luegen-beine",
	"grammar-de-proverb-dev-reden-silber",
	"grammar-de-proverb-dev-wer-rastet",
	"grammar-de-proverb-dev-repeated-das",
	"grammar-de-proverb-dev-casing-viele-koeche",
	"grammar-de-proverb-dev-stille-wasser-typo",
	"grammar-de-proverb-dev-wes-brot-archaic",
	"grammar-de-proverb-dev-reden-silber-partial",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-proverb-accept-wer-zuerst",
	"grammar-de-proverb-accept-wo-rauch",
	"grammar-de-proverb-accept-wo-wille",
	"grammar-de-proverb-accept-geteiltes-leid",
	"grammar-de-proverb-accept-glashaus-partial",
	"grammar-de-proverb-accept-frueher-vogel-slogan-context",
	"grammar-de-proverb-accept-eile-discourse-context",
	"grammar-de-proverb-accept-betten-idiom-context",
	"grammar-de-proverb-accept-doppelt-quotation-context",
	"grammar-de-proverb-accept-gaul-aphorism-context",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`Proverb ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const proverbGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateProverbGrammaticalResolution,
});

export const proverbGrammaticalResolutionAcceptanceExperiment =
	defineExperiment({
		promptSource,
		evaluation: acceptanceEvaluation,
		evaluator: evaluateProverbGrammaticalResolution,
	});
