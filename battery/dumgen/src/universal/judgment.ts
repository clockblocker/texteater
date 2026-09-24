import type {
	EntryType,
	Questions,
	SystemOneResult,
} from "promptsmith/typesafe";
import type { CallTrace, DumgenOptions } from "../types.js";
import { DumgenFailure } from "./failure.js";
import { contextFor, fingerprint, judgmentConfiguration } from "./trace.js";

/** Checks the answers' shape; a malformed answer is invalid model output. */
function validateAnswers<Q extends Questions>(
	questions: Q,
	value: unknown,
	stage: string,
	route: string,
): asserts value is SystemOneResult<Q> {
	const invalid = (message: string) =>
		new DumgenFailure("InvalidModelOutput", stage, message, route);
	const object = (value: unknown): Record<string, unknown> => {
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw invalid("Expected an object");
		return value as Record<string, unknown>;
	};
	const probability = (value: unknown): void => {
		if (
			typeof value !== "number" ||
			!Number.isFinite(value) ||
			value < 0 ||
			value > 1
		)
			throw invalid("Invalid probability");
	};
	const answers = object(object(value).answers);
	if (Object.keys(answers).length !== Object.keys(questions).length)
		throw invalid("Judgment answer count differs from questions");
	for (const [id, question] of Object.entries(questions)) {
		const answer = object(answers[id]);
		if (answer.type !== question.type)
			throw invalid(`Wrong answer type for ${id}`);
		if (question.type === "noul") {
			probability(answer.noul);
			continue;
		}
		probability(answer.confidence);
		const keys = Object.keys(question.criteria);
		const distribution = object(answer.probabilities);
		if (
			Object.keys(distribution).length !== keys.length ||
			keys.some((key) => !Object.hasOwn(distribution, key))
		)
			throw invalid(`Invalid candidate distribution for ${id}`);
		for (const value of Object.values(distribution)) probability(value);
		if (
			question.type === "choice" &&
			(typeof answer.choice !== "string" ||
				!Object.hasOwn(question.criteria, answer.choice))
		)
			throw invalid(`Unknown choice for ${id}`);
		if (
			question.type === "score" &&
			(typeof answer.score !== "number" ||
				!Number.isFinite(answer.score) ||
				answer.score < 0 ||
				answer.score > keys.length - 1)
		)
			throw invalid(`Invalid score for ${id}`);
	}
}

/** Executes one independent batch; uncertainty is an explicit answer, never a confidence threshold. */
export function judgmentCaller(options: DumgenOptions) {
	return async <const Q extends Questions>(
		stage: string,
		route: string,
		state: EntryType,
		questions: Q,
		signal: AbortSignal,
		dependsOn?: readonly string[],
	): Promise<SystemOneResult<Q>> => {
		if (!Object.keys(questions).length)
			throw new DumgenFailure(
				"InvalidInput",
				stage,
				"Empty judgment batch",
				route,
			);
		for (const question of Object.values(questions)) {
			if (
				question.type === "choice" &&
				(Object.keys(question.criteria).length < 2 ||
					Object.keys(question.criteria).length > 255)
			)
				throw new DumgenFailure(
					"InvalidInput",
					stage,
					"Choice requires 2–255 complete candidates",
					route,
				);
			if (
				question.type === "score" &&
				(question.criteria.length < 2 || question.criteria.length > 10)
			)
				throw new DumgenFailure(
					"InvalidInput",
					stage,
					"Score requires 2–10 levels",
					route,
				);
		}
		const context = contextFor(signal);
		const configuration = judgmentConfiguration(options);
		const request = {
			stage,
			route,
			input: state,
			questions,
			configuration,
			signal,
		};
		const base = {
			id: `${context.id}:${++context.sequence}`,
			operationId: context.id,
			executor: "TypeSafe" as const,
			request,
			dependsOn: dependsOn ?? context.calls.map((call) => call.id),
			fingerprint: await fingerprint({ questions, state }),
		};
		const startedAt = Date.now();
		const start = performance.now();
		let output: unknown;
		let transport: CallTrace["transport"] = "Failure";
		let validation: CallTrace["validation"] = "NotRun";
		let failure: string | undefined;
		try {
			signal.throwIfAborted();
			output = await options.judge(
				{ state, questions, model: configuration.model },
				{
					signal,
					timeout: configuration.settings.timeoutMs,
					retry: { maxRetries: 0 },
				},
			);
			transport = "Success";
			signal.throwIfAborted();
			validation = "Invalid";
			validateAnswers(questions, output, stage, route);
			validation = "Valid";
			return output;
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error);
			if (signal.aborted) {
				transport = "Interrupted";
				throw error;
			}
			// The executor is the transport boundary. After it succeeds, output
			// checks raise DumgenFailures and any other throw is a defect.
			if (transport !== "Success")
				throw new DumgenFailure(
					"ProviderFailure",
					stage,
					failure,
					route,
				);
			throw error;
		} finally {
			const exchange: CallTrace = {
				...base,
				transport,
				validation,
				...(output === undefined ? {} : { output }),
				...(failure ? { failure } : {}),
				startedAt,
				durationMs: performance.now() - start,
			};
			context.calls.push(exchange);
			options.onModelExchange?.(exchange);
		}
	};
}

/**
 * The recorded call of a finished judgment, found by the identity of the state
 * object handed to judgmentCaller. Concurrent judgments finish in any order,
 * so a dependent generation must link to its own judgment this way rather
 * than to the most recent call.
 */
export function recordedJudgment(
	signal: AbortSignal,
	state: EntryType,
): CallTrace {
	const call = contextFor(signal).calls.find(
		(candidate) =>
			candidate.executor === "TypeSafe" &&
			candidate.request.input === state,
	);
	if (!call) throw Error("Judgment was not recorded for this state");
	return call;
}
