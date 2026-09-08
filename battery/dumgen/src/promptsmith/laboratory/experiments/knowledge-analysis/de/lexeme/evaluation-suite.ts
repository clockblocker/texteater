import { defineExperiment } from "../../../../../assembly";
import { corpus } from "../../../../../production/knowledge-analysis/de/lexeme/golden-corpus/corpus";
import { promptSource } from "../../../../../production/knowledge-analysis/de/lexeme/prompt-source";
import { evaluateCombinedGermanKnowledge } from "../evaluator";

export const lexemeGermanKnowledgeDevelopmentExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.collections.development,
	evaluator: evaluateCombinedGermanKnowledge,
});

export const lexemeGermanKnowledgeAcceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.collections.acceptance,
	evaluator: evaluateCombinedGermanKnowledge,
});
