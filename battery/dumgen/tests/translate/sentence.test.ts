import { expect } from "bun:test";
import { isRecord } from "common-utils";
import { testEffect } from "common-utils/effect-test";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { TestClock } from "effect/testing";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import type { LunaAsk, LunaRequest, LunaResponse } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { sentenceTranslationPrompt } from "../../src/translate/de/prompt.js";
import type { TranslateSentenceInput } from "../../src/translate/types.js";
import { type FakeDumgenOptions, liveOver } from "../live-over.js";

const jev: JevAsk = async () => {
	throw Error("translate.sentence never asks jev");
};

/**
 * A Luna that answers each request with `answer` of its input, optionally
 * pausing behind `wait` so tests control in-flight overlap and abort timing
 * deterministically without wall-clock sleeps.
 */
function fakeLuna(
	answer: (input: Record<string, unknown>) => unknown,
	options: {
		readonly wait?: (
			request: LunaRequest,
			signal: AbortSignal,
		) => Promise<void>;
		readonly metadata?: Record<string, unknown>;
	} = {},
) {
	const sent: LunaRequest[] = [];
	const aborted: string[] = [];
	let inFlight = 0;
	let most = 0;
	const ask: LunaAsk = async (request, { stage, signal }) => {
		sent.push(request);
		inFlight++;
		most = Math.max(most, inFlight);
		try {
			if (options.wait) await options.wait(request, signal);
			if (signal.aborted) {
				aborted.push(stage);
				throw Error("aborted");
			}
			const input = isRecord(request.input) ? request.input : {};
			const output = answer(input);
			if (output instanceof Error) throw output;
			const response: LunaResponse = {
				output,
				metadata: {
					usage: { input_tokens: 40, output_tokens: 12 },
					...options.metadata,
				},
			};
			return response;
		} finally {
			inFlight--;
		}
	};
	return { ask, sent, aborted, most: () => most };
}

function translator(
	luna: ReturnType<typeof fakeLuna>,
	options: Partial<FakeDumgenOptions> = {},
) {
	const traces: OperationTrace[] = [];
	const live = liveOver({
		jev,
		luna: luna.ask,
		onOperation: (trace) => traces.push(trace),
		...options,
	});
	const translate = (input: TranslateSentenceInput) =>
		operations.translate.sentence(input).pipe(Effect.provide(live));
	return { translate, live, traces };
}

const sentence = "Der Hund bellt.";
const byLanguage = ({ language }: Record<string, unknown>) =>
	language === "ru" ? " Собака лает. " : "The dog barks.";

testEffect(
	"Luna translates the Sentence into en and into ru, one traced call each",
	() =>
		Effect.gen(function* () {
			const luna = fakeLuna(byLanguage);
			const { translate, traces } = translator(luna);
			const english = yield* translate({
				language: "de",
				sentence,
				into: "en",
			});
			const russian = yield* translate({
				language: "de",
				sentence: ` ${sentence}\n`,
				into: "ru",
			});
			expect([english, russian]).toEqual([
				"The dog barks.",
				"Собака лает.",
			]);
			expect(luna.sent.map(({ input }) => input)).toEqual([
				{ sentence, language: "en" },
				{ sentence, language: "ru" },
			]);
			const [request] = luna.sent;
			expect(request).toMatchObject({
				systemPrompt: sentenceTranslationPrompt,
				outputFormat: "json",
				outputSchema: { type: "string", minLength: 1 },
				configuration: { model: "gpt-5.6-luna" },
			});
			expect(traces.map(({ operation }) => operation)).toEqual([
				"translate.sentence",
				"translate.sentence",
			]);
			expect(traces[0]?.calls).toEqual([
				expect.objectContaining({
					stage: "translation",
					executor: "luna",
					inputTokens: 40,
					outputTokens: 12,
				}),
			]);
			// No payload unless the host asks for it.
			expect(traces[0]?.calls[0]?.payload).toBeUndefined();
		}),
);

testEffect(
	"the neighbouring Sentences go as context, a blank one not at all, and payloads keep the exchange",
	() =>
		Effect.gen(function* () {
			const luna = fakeLuna(byLanguage);
			const { translate, traces } = translator(luna, {
				tracePayloads: true,
			});
			yield* translate({
				language: "de",
				sentence,
				into: "en",
				neighbours: { before: " Es ist Nacht. ", after: "  " },
			});
			expect(luna.sent[0]?.input).toEqual({
				sentence,
				language: "en",
				before: "Es ist Nacht.",
			});
			expect(traces[0]?.calls[0]?.payload).toEqual({
				request: luna.sent[0],
				response: expect.objectContaining({ output: "The dog barks." }),
			});
		}),
);

testEffect(
	"translations under one provided Layer share its request budget, and a queued one records its wait",
	() =>
		Effect.gen(function* () {
			const firstStarted = Promise.withResolvers<void>();
			const releaseFirst = Promise.withResolvers<void>();
			let calls = 0;
			const luna = fakeLuna(byLanguage, {
				wait: async () => {
					if (++calls === 1) {
						firstStarted.resolve();
						await releaseFirst.promise;
					}
				},
			});
			const { live, traces } = translator(luna, { requestBudget: 1 });
			const fiber = yield* Effect.forkChild(
				Effect.all(
					[
						operations.translate.sentence({
							language: "de",
							sentence,
							into: "en",
						}),
						operations.translate.sentence({
							language: "de",
							sentence,
							into: "ru",
						}),
					],
					{ concurrency: "unbounded" },
				).pipe(Effect.provide(live)),
			);
			yield* Effect.promise(() => firstStarted.promise);
			yield* Effect.yieldNow;
			yield* TestClock.adjust("10 millis");
			releaseFirst.resolve();
			yield* Fiber.join(fiber);

			expect(luna.most()).toBe(1);
			const waits = traces.flatMap((trace) => trace.waits);
			expect(waits).toEqual([{ call: 0, waitMs: 10 }]);
		}),
);

testEffect(
	"interrupting a translation aborts its call and traces it as Interrupted",
	() =>
		Effect.gen(function* () {
			const started = Promise.withResolvers<void>();
			const luna = fakeLuna(byLanguage, {
				wait: (_request, signal) => {
					started.resolve();
					return new Promise<void>((resolve) => {
						signal.addEventListener("abort", () => resolve(), {
							once: true,
						});
					});
				},
			});
			const { translate, traces } = translator(luna);
			const fiber = yield* Effect.forkChild(
				translate({ language: "de", sentence, into: "en" }),
			);
			yield* Effect.promise(() => started.promise);
			yield* Fiber.interrupt(fiber);
			const exit = yield* Fiber.await(fiber);
			expect(Exit.isFailure(exit)).toBe(true);
			expect(luna.aborted).toEqual(["translation"]);
			expect(traces).toHaveLength(1);
			expect(traces[0]?.calls[0]?.failure).toEqual({
				tag: "Interrupted",
				message: "aborted",
			});
		}),
);

/** The error a translation fails with, or the value it answered. */
const failureOf = (luna: ReturnType<typeof fakeLuna>) =>
	Effect.flip(
		translator(luna).translate({ language: "de", sentence, into: "en" }),
	);

testEffect(
	"a failed call is a ProviderFailure, and an unusable answer an InvalidModelOutput, neither asked again",
	() =>
		Effect.gen(function* () {
			const down = fakeLuna(() => Error("socket hang up"));
			const failure = yield* failureOf(down);
			expect(failure).toBeInstanceOf(ProviderFailure);
			expect(failure).toMatchObject({
				stage: "translation",
				message: "socket hang up",
			});
			expect(down.sent).toHaveLength(1);
			for (const answer of ["  ", 3, null, ["The dog barks."]]) {
				const luna = fakeLuna(() => answer);
				const failure = yield* failureOf(luna);
				expect(failure).toBeInstanceOf(InvalidModelOutput);
				expect(failure.message).toStartWith(
					"Luna answered no translation",
				);
				expect(luna.sent).toHaveLength(1);
			}
			const refused = fakeLuna(() => undefined, {
				metadata: { problem: "Luna refused: no" },
			});
			expect(yield* failureOf(refused)).toEqual(
				new InvalidModelOutput({
					stage: "translation",
					message: "Luna refused: no",
				}),
			);
		}),
);

testEffect(
	"another language, a blank Sentence, another translation language or a neighbour that is no text is a Defect before anything is asked",
	() =>
		Effect.gen(function* () {
			const luna = fakeLuna(byLanguage);
			const { translate, traces } = translator(luna);
			const input: TranslateSentenceInput = {
				language: "de",
				sentence,
				into: "en",
			};
			const cases: [TranslateSentenceInput, string][] = [
				// Deliberately invalid, as an untyped host could send them.
				[{ ...input, language: "en" as never }, 'German ("de") only'],
				[{ ...input, sentence: " \n" }, "needs a Sentence"],
				[{ ...input, into: "fr" as never }, 'en or ru, not "fr"'],
				[{ ...input, neighbours: { before: 3 as never } }, "as text"],
			];
			for (const [bad, message] of cases) {
				const exit = yield* Effect.exit(translate(bad));
				expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(
					true,
				);
				if (Exit.isFailure(exit)) {
					const defect = Cause.squash(exit.cause);
					expect(
						defect instanceof Error
							? defect.message
							: String(defect),
					).toContain(message);
				}
			}
			expect(luna.sent).toEqual([]);
			expect(traces.flatMap(({ calls }) => calls)).toEqual([]);
		}),
);
