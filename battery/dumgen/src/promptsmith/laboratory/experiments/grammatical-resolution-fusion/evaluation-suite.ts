import { defineExperiment } from "../../../assembly";
import { corpus } from "../../prompt-source/grammatical-resolution/de/construction/fusion/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../prompt-source/grammatical-resolution/de/construction/fusion/prompt-source";
import { evaluateFusionGrammaticalResolution } from "./evaluator";

export const evaluation = corpus.select([
	"grammar-de-fusion-am",
	"grammar-de-fusion-beim-typo",
	"grammar-de-fusion-vom",
	"grammar-de-fusion-ins",
	"grammar-de-fusion-ans",
	"grammar-de-fusion-aufs",
	"grammar-de-fusion-fuers",
	"grammar-de-fusion-ums",
	"grammar-de-fusion-durchs",
	"grammar-de-fusion-uebers",
	"grammar-de-fusion-beim-initial",
	"grammar-de-fusion-unresolved-adp-mit",
	"grammar-de-fusion-unresolved-am-superlative",
	"grammar-de-fusion-unresolved-overbroad-noun",
	"grammar-de-fusion-unresolved-two-fusions",
	"grammar-de-fusion-unresolved-mixed-fusion-adp",
	"grammar-de-fusion-unresolved-valid-ihm",
	"grammar-de-fusion-unresolved-idiom-whole",
	"grammar-de-fusion-unresolved-discourse-whole",
	"grammar-de-fusion-unresolved-paired-frame",
]);

if (!evaluation.isDisjointFrom(demonstrations)) {
	throw new Error(
		"Fusion Grammatical Resolution demonstrations and evaluation must be disjoint.",
	);
}

export const fusionGrammaticalResolutionExperiment = defineExperiment({
	promptSource,
	evaluation,
	evaluator: evaluateFusionGrammaticalResolution,
});
