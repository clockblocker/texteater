/**
 * How every operation reaches jev through the call adapter: a request is
 * split into chunks of `questionsPerRequest` questions, each naming the
 * pinned model, sent side by side under the request budget, and checked
 * before its answers are used. The first chunk that fails fails the
 * request and interrupts the others.
 */

import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import type { OperationScope } from "./call.js";
import { InvalidModelOutput } from "./errors.js";
import type { Answer, Answers, Ask, AskRequest } from "./segment/ask.js";
import {
	type JevAsk,
	type JevRequest,
	type JevResponse,
	questionsPerRequest,
} from "./segment/jev.js";

/** What an operation reaches jev with: the host's transport and the pinned version. */
export type JevSettings = { readonly ask: JevAsk; readonly model: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/** A reported confidence and the probabilities it came from, as numbers. */
const isWeighed = (value: Record<string, unknown>) =>
	typeof value.confidence === "number" &&
	isRecord(value.probabilities) &&
	Object.values(value.probabilities).every(
		(probability) => typeof probability === "number",
	);

/**
 * Whether `value`, already of the question's type, holds that type's whole
 * `Answer`: a finite Noul, a Choice among the question's criteria, or a
 * finite score, the last two with their confidence and probabilities.
 */
function fitsQuestion(
	question: Question,
	value: Record<string, unknown>,
): value is Answer {
	switch (question.type) {
		case "noul":
			return isFiniteNumber(value.noul);
		case "choice":
			return (
				typeof value.choice === "string" &&
				Object.hasOwn(question.criteria, value.choice) &&
				isWeighed(value)
			);
		case "score":
			return isFiniteNumber(value.score) && isWeighed(value);
	}
}

/**
 * Answers when every question of the chunk has one of its type and shape,
 * from the pinned model; `InvalidModelOutput` naming the first offending
 * ids otherwise.
 */
export function checkedAnswers(
	stage: string,
	model: string,
	chunk: readonly (readonly [string, Question])[],
	response: JevResponse,
): Answers | InvalidModelOutput {
	const { answers } = response;
	const unusable = (message: string) =>
		new InvalidModelOutput({ stage, message });
	if (response.model !== model)
		return unusable(
			`jev answered as ${response.model}, not the pinned ${model}`,
		);
	const missing = chunk.flatMap(([id]) => (id in answers ? [] : [id]));
	if (missing.length > 0)
		return unusable(
			`jev answered without ${missing.slice(0, 3).join(", ")}`,
		);
	const mistyped = chunk.flatMap(([id, question]) => {
		const answer = answers[id];
		return isRecord(answer) && answer.type === question.type ? [] : [id];
	});
	if (mistyped.length > 0)
		return unusable(
			`jev answered ${mistyped.slice(0, 3).join(", ")} with another type than asked`,
		);
	const checked: Record<string, Answer> = {};
	const malformed: string[] = [];
	for (const [id, question] of chunk) {
		const answer = answers[id];
		if (isRecord(answer) && fitsQuestion(question, answer))
			checked[id] = answer;
		else malformed.push(id);
	}
	if (malformed.length > 0)
		return unusable(
			`jev answered ${malformed.slice(0, 3).join(", ")} with an answer that does not fit its question`,
		);
	return checked;
}

/**
 * The stages' `ask` over the operation's calls: each request in chunks,
 * sent side by side under the request budget, failing as soon as one chunk
 * fails. `sentence` places the calls in the trace when the operation reads
 * several Sentences.
 */
export const askThrough =
	(scope: OperationScope, jev: JevSettings, sentence?: number): Ask =>
	({ stage, state, questions }: AskRequest) => {
		const entries = Object.entries(questions);
		const chunks: (typeof entries)[] = [];
		for (let at = 0; at < entries.length; at += questionsPerRequest)
			chunks.push(entries.slice(at, at + questionsPerRequest));
		return Effect.forEach(
			chunks,
			(chunk) => {
				const request: JevRequest = {
					model: jev.model,
					state,
					questions: Object.fromEntries(chunk),
				};
				return scope.call({
					stage,
					...(sentence === undefined ? {} : { sentence }),
					executor: "jev",
					request,
					send: (signal) => jev.ask(request, { stage, signal }),
					tokens: ({ usage }) => ({
						inputTokens: usage.input_tokens,
						outputTokens: usage.output_tokens,
					}),
					check: (response) =>
						checkedAnswers(stage, jev.model, chunk, response),
				});
			},
			{ concurrency: "unbounded" },
		).pipe(
			Effect.map((answered): Answers => Object.assign({}, ...answered)),
		);
	};
