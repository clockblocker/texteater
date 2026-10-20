import { expect, test } from "bun:test";
import { isRecord } from "common-utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { createDumgen, type DumgenOptions } from "../../src/create-dumgen.js";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import type { LunaAsk, LunaRequest, LunaResponse } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { sentenceTranslationPrompt } from "../../src/translate/de/prompt.js";
import type { TranslateSentenceInput } from "../../src/translate/types.js";

const jev: JevAsk = async () => {
	throw Error("translate.sentence never asks jev");
};

/**
 * A Luna that answers each request with `answer` of its input, `delayMs`
 * later, keeping what it was sent and what it saw aborted.
 */
function fakeLuna(
	answer: (input: Record<string, unknown>) => unknown,
	options: {
		readonly delayMs?: number;
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
			await new Promise((resolve) =>
				setTimeout(resolve, options.delayMs ?? 1),
			);
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
	options: Partial<DumgenOptions> = {},
) {
	const traces: OperationTrace[] = [];
	const dumgen = createDumgen({
		jev,
		luna: luna.ask,
		onOperation: (trace) => traces.push(trace),
		...options,
	});
	return { translate: dumgen.translate.sentence, traces };
}

const sentence = "Der Hund bellt.";
const byLanguage = ({ language }: Record<string, unknown>) =>
	language === "ru" ? " Собака лает. " : "The dog barks.";

test("Luna translates the Sentence into en and into ru, one traced call each", async () => {
	const luna = fakeLuna(byLanguage);
	const { translate, traces } = translator(luna);
	const english = await Effect.runPromise(
		translate({ language: "de", sentence, into: "en" }),
	);
	const russian = await Effect.runPromise(
		translate({ language: "de", sentence: ` ${sentence}\n`, into: "ru" }),
	);
	expect([english, russian]).toEqual(["The dog barks.", "Собака лает."]);
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
});

test("the neighbouring Sentences go as context, a blank one not at all, and payloads keep the exchange", async () => {
	const luna = fakeLuna(byLanguage);
	const { translate, traces } = translator(luna, { tracePayloads: true });
	await Effect.runPromise(
		translate({
			language: "de",
			sentence,
			into: "en",
			neighbours: { before: " Es ist Nacht. ", after: "  " },
		}),
	);
	expect(luna.sent[0]?.input).toEqual({
		sentence,
		language: "en",
		before: "Es ist Nacht.",
	});
	expect(traces[0]?.calls[0]?.payload).toEqual({
		request: luna.sent[0],
		response: expect.objectContaining({ output: "The dog barks." }),
	});
});

test("translations share the instance's request budget, and a queued one records its wait", async () => {
	const luna = fakeLuna(byLanguage, { delayMs: 10 });
	const { translate, traces } = translator(luna, { requestBudget: 1 });
	await Effect.runPromise(
		Effect.all(
			[
				translate({ language: "de", sentence, into: "en" }),
				translate({ language: "de", sentence, into: "ru" }),
			],
			{ concurrency: "unbounded" },
		),
	);
	expect(luna.most()).toBe(1);
	const waits = traces.flatMap((trace) => trace.waits);
	expect(waits).toEqual([{ call: 0, waitMs: expect.any(Number) }]);
	expect(waits[0]?.waitMs).toBeGreaterThan(5);
});

test("interrupting a translation aborts its call and traces it as Interrupted", async () => {
	const luna = fakeLuna(byLanguage, { delayMs: 30 });
	const { translate, traces } = translator(luna);
	const fiber = Effect.runFork(
		translate({ language: "de", sentence, into: "en" }),
	);
	await new Promise((resolve) => setTimeout(resolve, 5));
	await Effect.runPromise(Fiber.interrupt(fiber));
	const exit = await Effect.runPromise(Fiber.await(fiber));
	expect(Exit.isFailure(exit)).toBe(true);
	expect(luna.aborted).toEqual(["translation"]);
	expect(traces).toHaveLength(1);
	expect(traces[0]?.calls[0]?.failure).toEqual({
		tag: "Interrupted",
		message: "aborted",
	});
});

/** The error a translation fails with, or the value it answered. */
async function failureOf(luna: ReturnType<typeof fakeLuna>) {
	const { translate } = translator(luna);
	return Effect.runPromise(
		Effect.flip(translate({ language: "de", sentence, into: "en" })),
	);
}

test("a failed call is a ProviderFailure, and an unusable answer an InvalidModelOutput, neither asked again", async () => {
	const down = fakeLuna(() => Error("socket hang up"));
	const failure = await failureOf(down);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(failure).toMatchObject({
		stage: "translation",
		message: "socket hang up",
	});
	expect(down.sent).toHaveLength(1);
	for (const answer of ["  ", 3, null, ["The dog barks."]]) {
		const luna = fakeLuna(() => answer);
		const failure = await failureOf(luna);
		expect(failure).toBeInstanceOf(InvalidModelOutput);
		expect(failure.message).toStartWith("Luna answered no translation");
		expect(luna.sent).toHaveLength(1);
	}
	const refused = fakeLuna(() => undefined, {
		metadata: { problem: "Luna refused: no" },
	});
	expect(await failureOf(refused)).toEqual(
		new InvalidModelOutput({
			stage: "translation",
			message: "Luna refused: no",
		}),
	);
});

test("another language, a blank Sentence, another translation language or a neighbour that is no text is a Defect before anything is asked", async () => {
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
		const exit = await Effect.runPromiseExit(translate(bad));
		expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
		await expect(Effect.runPromise(translate(bad))).rejects.toThrow(
			message,
		);
	}
	expect(luna.sent).toEqual([]);
	expect(traces.flatMap(({ calls }) => calls)).toEqual([]);
});
