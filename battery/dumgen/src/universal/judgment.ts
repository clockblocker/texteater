import * as Effect from "effect/Effect";
import type {
	EntryType,
	Questions,
	SystemOneResult,
} from "promptsmith/typesafe";
import type { DumgenOptions } from "../types.js";
import { DumgenFailure } from "./failure.js";
import {
	type Called,
	call,
	judgmentConfiguration,
	type OperationScope,
} from "./trace.js";

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
	return <const Q extends Questions>(
		stage: string,
		route: string,
		state: EntryType,
		questions: Q,
		scope: OperationScope,
		dependsOn: readonly string[],
	): Effect.Effect<Called<SystemOneResult<Q>>, DumgenFailure> => {
		const invalid = (message: string) =>
			Effect.fail(
				new DumgenFailure("InvalidInput", stage, message, route),
			);
		if (!Object.keys(questions).length)
			return invalid("Empty judgment batch");
		for (const question of Object.values(questions)) {
			if (
				question.type === "choice" &&
				(Object.keys(question.criteria).length < 2 ||
					Object.keys(question.criteria).length > 255)
			)
				return invalid("Choice requires 2–255 complete candidates");
			if (
				question.type === "score" &&
				(question.criteria.length < 2 || question.criteria.length > 10)
			)
				return invalid("Score requires 2–10 levels");
		}
		const configuration = judgmentConfiguration(options);
		return call(options, scope, {
			executor: "TypeSafe",
			dependsOn,
			fingerprinted: { questions, state },
			request: (signal) => ({
				stage,
				route,
				input: state,
				questions,
				configuration,
				signal,
			}),
			send: (request) =>
				options.judge(
					{ state, questions, model: configuration.model },
					{
						signal: request.signal,
						timeout: configuration.settings.timeoutMs,
						retry: { maxRetries: 0 },
					},
				),
			evidence: (output) => (output === undefined ? {} : { output }),
			validate: (output) => {
				validateAnswers(questions, output, stage, route);
				return output;
			},
		});
	};
}
