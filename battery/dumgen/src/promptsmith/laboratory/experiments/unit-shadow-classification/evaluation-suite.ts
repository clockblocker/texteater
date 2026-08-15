import { defineExperiment } from "../../../assembly";
import { corpus } from "../../../production/unit-shadow-classification/golden-corpus/corpus";
import { promptSource } from "../../../production/unit-shadow-classification/prompt-source";
import { evaluateUnitShadowClassification } from "./evaluator";

export const evaluationSelection = corpus.collections.lexemes
	.union(corpus.collections.nonLexemes)
	.union(corpus.collections.rejectionsAndTraps);

export const unitShadowClassificationExperiment = defineExperiment({
	promptSource,
	evaluation: evaluationSelection,
	evaluator: evaluateUnitShadowClassification,
});
