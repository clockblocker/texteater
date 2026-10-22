/**
 * How every operation reaches jev: the `Jev` service, built from the host's
 * `JevTransport`, the `RequestBudget` and the pinned `JevModel`. A request
 * is split into chunks of `questionsPerRequest` questions, each naming the
 * pinned model, sent side by side under the request budget, and checked
 * before its answers are used. The first chunk that fails fails the
 * request and interrupts the others.
 */

import type { Question } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { type CallLog, callContext, callModel, RequestBudget } from "./call.js";
import { InvalidModelOutput } from "./errors.js";
import type {
	Answer,
	Answers,
	Ask,
	AskFailure,
	AskRequest,
} from "./segment/ask.js";
import {
	isFloatingModel,
	type JevAsk,
	type JevRequest,
	type JevResponse,
	pinnedJevModel,
	questionsPerRequest,
} from "./segment/jev.js";

/**
 * The host's jev transport, a Promise port taking a signal:
 * `createTypeSafeAsk` in production, the lab's cache or a fake elsewhere.
 */
export class JevTransport extends Context.Service<
	JevTransport,
	{ readonly ask: JevAsk }
>()("dumgen/JevTransport") {}

/** The jev version every request names; a floating alias is refused. */
export const JevModel = Context.Reference<string>("dumgen/JevModel", {
	defaultValue: () => pinnedJevModel,
});

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
 * jev as the operations reach it: each request in chunks, sent side by
 * side under the request budget, failing as soon as one chunk fails. Its
 * calls are placed under the `CurrentSentence`.
 */
export class Jev extends Context.Service<
	Jev,
	{
		readonly ask: (
			request: AskRequest,
		) => Effect.Effect<Answers, AskFailure, CallLog>;
	}
>()("dumgen/Jev") {
	static readonly layer = Layer.effect(
		Jev,
		Effect.gen(function* () {
			const transport = yield* JevTransport;
			const budget = yield* RequestBudget;
			const model = yield* JevModel;
			if (isFloatingModel(model))
				return yield* Effect.die(
					Error(
						`${model} floats between jev versions; pin one, such as ${pinnedJevModel}`,
					),
				);
			return Jev.of({
				ask: ({ stage, state, questions }) => {
					const entries = Object.entries(questions);
					const chunks: (typeof entries)[] = [];
					for (
						let at = 0;
						at < entries.length;
						at += questionsPerRequest
					)
						chunks.push(
							entries.slice(at, at + questionsPerRequest),
						);
					return Effect.forEach(
						chunks,
						(chunk) => {
							const request: JevRequest = {
								model,
								state,
								questions: Object.fromEntries(chunk),
							};
							return callModel(budget, {
								stage,
								executor: "jev",
								request,
								send: (signal) =>
									transport.ask(request, { stage, signal }),
								tokens: ({ usage }) => ({
									inputTokens: usage.input_tokens,
									outputTokens: usage.output_tokens,
								}),
								check: (response) =>
									checkedAnswers(
										stage,
										model,
										chunk,
										response,
									),
							});
						},
						{ concurrency: "unbounded" },
					).pipe(
						Effect.map(
							(answered): Answers =>
								Object.assign({}, ...answered),
						),
					);
				},
			});
		}),
	);
}

/**
 * The stages' `ask` (Dumgen ADR 0009): `Jev`'s, carrying the running
 * operation's CallLog and CurrentSentence, so a stage reads no services.
 */
export const stageAsk: Effect.Effect<Ask, never, Jev | CallLog> = Effect.gen(
	function* () {
		const jev = yield* Jev;
		const context = yield* callContext;
		return (request) =>
			jev.ask(request).pipe(Effect.provideContext(context));
	},
);
