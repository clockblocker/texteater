import { defineExperiment } from "../../../../../assembly";
import { corpus } from "../../../../../production/reading-resolution/de/golden-corpus/corpus";
import { promptSource } from "../../../../../production/reading-resolution/de/prompt-source";
import {
	evaluateReadingMeaningIsolation,
	meaningIsolationCaseIds,
} from "./evaluator";

export const readingMeaningIsolationExperiment = defineExperiment({
	promptSource,
	evaluation: corpus.select(meaningIsolationCaseIds),
	evaluator: evaluateReadingMeaningIsolation,
});
