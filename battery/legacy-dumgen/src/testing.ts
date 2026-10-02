/**
 * Deterministic model doubles for tests in Dumgen and its consumers. Each
 * fixture injects reviewed outputs as bounded judgments and requested text, so
 * a test checks projection and orchestration, never live linguistic accuracy.
 */
export {
	choiceAnswers,
	executeOutput,
	queuedTargetJudgment,
	readingJudgment,
	rejectJudgment,
} from "./testing/execution-fixture.js";
export { grammarFixture } from "./testing/grammar-fixture.js";
export { intakeFixture } from "./testing/intake-fixture.js";
export { knowledgeFixture } from "./testing/knowledge-fixture.js";
export { pipelineFixture } from "./testing/pipeline-fixture.js";
