import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/grammatical-resolution/de/construction/fusion/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../../production/grammatical-resolution/de/construction/fusion/prompt-source";
import { evaluateFusionGrammaticalResolution } from "./evaluator";

export const developmentEvaluation = corpus.select([
	"grammar-de-fusion-dev-am-bahnhof",
	"grammar-de-fusion-dev-beim-umzug",
	"grammar-de-fusion-dev-vom-arzt",
	"grammar-de-fusion-dev-ins-haus",
	"grammar-de-fusion-dev-ans-meer",
	"grammar-de-fusion-dev-aufs-dach",
	"grammar-de-fusion-dev-fuers-essen",
	"grammar-de-fusion-dev-ums-haus",
	"grammar-de-fusion-dev-durchs-tor",
	"grammar-de-fusion-dev-uebers-wetter",
	"grammar-de-fusion-dev-zum-behufe-archaic-context",
	"grammar-de-fusion-dev-hinterm-schrank",
	"grammar-de-fusion-dev-vorm-haus",
	"grammar-de-fusion-dev-unterm-tisch",
	"grammar-de-fusion-dev-beim-initial",
	"grammar-de-fusion-dev-beimm-typo",
	"grammar-de-fusion-dev-ins-historical-variant",
	"grammar-de-fusion-dev-zur-anmeldung",
]);

export const acceptanceEvaluation = corpus.select([
	"grammar-de-fusion-accept-im-garten",
	"grammar-de-fusion-accept-zur-schule",
	"grammar-de-fusion-accept-zum-markt",
	"grammar-de-fusion-accept-am-see",
	"grammar-de-fusion-accept-beim-lesen",
	"grammar-de-fusion-accept-vom-bahnhof",
	"grammar-de-fusion-accept-ans-ufer",
	"grammar-de-fusion-accept-aufs-land",
	"grammar-de-fusion-accept-durchs-fenster",
	"grammar-de-fusion-accept-uebers-meer",
]);

for (const [leftName, left, rightName, right] of [
	["demonstrations", demonstrations, "development", developmentEvaluation],
	["demonstrations", demonstrations, "acceptance", acceptanceEvaluation],
	["development", developmentEvaluation, "acceptance", acceptanceEvaluation],
] as const) {
	if (!left.isDisjointFrom(right)) {
		throw new Error(
			`Fusion ${leftName} and ${rightName} selections must be disjoint.`,
		);
	}
}

export const evaluation = developmentEvaluation;

export const fusionGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation: developmentEvaluation,
	evaluator: evaluateFusionGrammaticalResolution,
});

export const fusionGrammaticalResolutionAcceptanceExperiment = defineExperiment(
	{
		promptSource,
		evaluation: acceptanceEvaluation,
		evaluator: evaluateFusionGrammaticalResolution,
	},
);
