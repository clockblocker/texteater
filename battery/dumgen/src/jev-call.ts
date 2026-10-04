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
import type { Answers, Ask, AskRequest } from "./segment/ask.js";
import {
	type JevAsk,
	type JevRequest,
	type JevResponse,
	questionsPerRequest,
} from "./segment/jev.js";

/** What an operation reaches jev with: the host's transport and the pinned version. */
export type JevSettings = { readonly ask: JevAsk; readonly model: string };

/** Answers when every question of the chunk has one of its type, from the pinned model. */
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
	const mistyped = chunk.flatMap(([id, question]) =>
		answers[id]?.type === question.type ? [] : [id],
	);
	if (mistyped.length > 0)
		return unusable(
			`jev answered ${mistyped.slice(0, 3).join(", ")} with another type than asked`,
		);
	return answers;
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
