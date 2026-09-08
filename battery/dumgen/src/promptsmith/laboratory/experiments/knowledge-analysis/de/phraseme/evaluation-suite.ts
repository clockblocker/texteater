import { defineExperiment } from "../../../../../assembly";
import { corpus } from "../../../../../production/knowledge-analysis/de/phraseme/golden-corpus/corpus";
import { promptSource } from "../../../../../production/knowledge-analysis/de/phraseme/prompt-source";
import { evaluateCombinedGermanKnowledge } from "../evaluator";

export const phrasemeGermanKnowledgeDevelopmentExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.collections.development,
	evaluator: evaluateCombinedGermanKnowledge,
});

export const phrasemeGermanKnowledgeAcceptanceExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.collections.acceptance,
	evaluator: evaluateCombinedGermanKnowledge,
});
