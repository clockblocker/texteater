import { defineExperiment } from "../../../../../assembly";
import { corpus } from "../../../../../production/knowledge-analysis/de/combined/golden-corpus/corpus";
import { promptSource } from "../../../../../production/knowledge-analysis/de/combined/prompt-source";
import { evaluateCombinedGermanKnowledge } from "./evaluator";

export const combinedGermanKnowledgeDevelopmentExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.collections.development,
	evaluator: evaluateCombinedGermanKnowledge,
});

export const combinedGermanKnowledgeAcceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.collections.acceptance,
	evaluator: evaluateCombinedGermanKnowledge,
});
