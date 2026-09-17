import type {
	EntryType,
	Questions,
	SystemOneResult,
} from "promptsmith/typesafe";
import type { CallTrace, DumgenOptions } from "../types.js";
import { DumgenFailure } from "./failure.js";
import { contextFor, fingerprint, judgmentConfiguration } from "./trace.js";

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw Error("Expected an object");
	return value as Record<string, unknown>;
}
function probability(value: unknown): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	)
		throw Error("Invalid probability");
}
function validateAnswers<Q extends Questions>(
	questions: Q,
	value: unknown,
): asserts value is SystemOneResult<Q> {
	const answers = object(object(value).answers);
	if (Object.keys(answers).length !== Object.keys(questions).length)
		throw Error("Judgment answer count differs from questions");
	for (const [id, question] of Object.entries(questions)) {
		const answer = object(answers[id]);
		if (answer.type !== question.type)
			throw Error(`Wrong answer type for ${id}`);
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
			throw Error(`Invalid candidate distribution for ${id}`);
		for (const value of Object.values(distribution)) probability(value);
		if (
			question.type === "choice" &&
			(typeof answer.choice !== "string" ||
				!Object.hasOwn(question.criteria, answer.choice))
		)
			throw Error(`Unknown choice for ${id}`);
		if (
			question.type === "score" &&
			(typeof answer.score !== "number" ||
				!Number.isFinite(answer.score) ||
				answer.score < 0 ||
				answer.score > keys.length - 1)
		)
			throw Error(`Invalid score for ${id}`);
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
			validateAnswers(questions, output);
			validation = "Valid";
			return output;
		} catch (error) {
			failure = error instanceof Error ? error.message : String(error);
			if (signal.aborted) {
				transport = "Interrupted";
				throw error;
			}
			throw error instanceof DumgenFailure
				? error
				: new DumgenFailure(
						transport === "Success"
							? "InvalidModelOutput"
							: "ProviderFailure",
						stage,
						failure,
						route,
					);
		} finally {
			const exchange: CallTrace = {
				...base,
				transport,
				validation,
				...(output === undefined ? {} : { output }),
				...(failure ? { failure } : {}),
				durationMs: performance.now() - start,
			};
			context.calls.push(exchange);
			options.onModelExchange?.(exchange);
		}
	};
}
