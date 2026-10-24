import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import type { LunaAsk } from "../../src/luna.js";
import { operations } from "../../src/operations.js";
import { liveOver } from "../live-over.js";
import {
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// Unresolved and failed input (#861, #859).

test("a unit intake left Unresolved stays Unresolved and asks nothing", async () => {
	const jev = fakeJev();
	const luna = fakeLuna();
	const { result, trace } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Blarg kommt."),
			unit: { segments: [0], route: "Unresolved" },
		},
	);
	expect(result).toEqual({ _tag: "Unresolved" });
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
	expect(trace).toMatchObject({
		operation: "resolve.grammar",
		calls: [],
		resolution: { outcome: "Unresolved", reason: "UnresolvedUnit" },
	});
});

test("another language, a failed Sentence or a unit outside its Sentence is a Defect before anything is asked", async () => {
	const jev = fakeJev();
	const live = liveOver({ jev: jev.ask, luna: fakeLuna().ask });
	const sentence = sentenceOf("Er kommt.");
	const input = {
		language: "de" as const,
		sentence,
		unit: unitOf([2], "Lexeme/VERB"),
		neighbours: {},
		lemmaCandidates: [],
	};
	await expect(
		Effect.runPromise(
			operations.resolve
				.grammar({ ...input, language: "en" as "de" })
				.pipe(Effect.provide(live)),
		),
	).rejects.toThrow('No grammar resolver registered for "en"');
	await expect(
		Effect.runPromise(
			operations.resolve
				.grammar({
					...input,
					sentence: { ...sentence, units: [], failed: true },
				})
				.pipe(Effect.provide(live)),
		),
	).rejects.toThrow("segment it again");
	await expect(
		Effect.runPromise(
			operations.resolve
				.grammar({
					...input,
					unit: unitOf([1], "Lexeme/VERB"),
				})
				.pipe(Effect.provide(live)),
		),
	).rejects.toThrow("ResolvableText");
	expect(jev.sent).toEqual([]);
});

// The click API's error channel (#859, #858).

test("a transport failure is a ProviderFailure and an unusable answer an InvalidModelOutput; nothing is retried", async () => {
	const sentence = sentenceOf("Er kommt.");
	const unit = unitOf([2], "Lexeme/VERB");
	const down = fakeJev({}, { fail: () => true });
	const failure = await Effect.runPromise(
		Effect.flip(
			operations.resolve
				.grammar({
					language: "de",
					sentence,
					unit,
					neighbours: {},
					lemmaCandidates: [],
				})
				.pipe(
					Effect.provide(
						liveOver({
							jev: down.ask,
							luna: fakeLuna().ask,
						}),
					),
				),
		),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(down.sent).toHaveLength(1);
	const garbled = fakeLuna(() => ({ canonicalForm: "kommen" }));
	const unusable = await Effect.runPromise(
		Effect.flip(
			operations.resolve
				.grammar({
					language: "de",
					sentence,
					unit,
					neighbours: {},
					lemmaCandidates: [],
				})
				.pipe(
					Effect.provide(
						liveOver({
							jev: fakeJev().ask,
							luna: garbled.ask,
						}),
					),
				),
		),
	);
	expect(unusable).toBeInstanceOf(InvalidModelOutput);
	expect(unusable).toMatchObject({ stage: "canonical" });
	expect(garbled.sent).toHaveLength(1);
});

test("a click is all-or-nothing: a failed Case question interrupts Luna's call in flight", async () => {
	// Er0 _1 grüßt2 _3 der4 _5 Anna6 .7 (a PROPN's Case runs beside Luna)
	const jev = fakeJev(
		{ gender: "die", number: "Sing", article: "Bare" },
		{ fail: (stage) => stage === "case" },
	);
	const luna = fakeLuna(undefined, { delayMs: 50 });
	const failure = await Effect.runPromise(
		Effect.flip(
			operations.resolve
				.grammar({
					language: "de",
					sentence: sentenceOf("Er hilft der Anna."),
					unit: unitOf([4, 6], "Lexeme/PROPN"),
					neighbours: {},
					lemmaCandidates: [],
				})
				.pipe(
					Effect.provide(liveOver({ jev: jev.ask, luna: luna.ask })),
				),
		),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(luna.aborted).toEqual(["canonical"]);
});

// The trace (#858).

test("the trace names the operation, its calls by executor and how the click came out", async () => {
	const { trace } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("kommen").ask },
		{
			sentence: sentenceOf("Er kommt."),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(trace?.operation).toBe("resolve.grammar");
	// Luna is asked first, on a guess, while jev judges.
	expect(
		trace?.calls.map(({ stage, executor }) => [stage, executor]),
	).toEqual([
		["canonical", "luna"],
		["grammar", "jev"],
	]);
	expect(trace?.calls.map(({ inputTokens }) => inputTokens)).toEqual([
		50, 100,
	]);
	expect(trace?.resolution).toEqual({ outcome: "Resolved" });
});

test("a Luna answer the transport kept no output for is refused with the transport's reason", async () => {
	const luna: LunaAsk = async () => ({
		output: undefined,
		metadata: { problem: "Luna refused: no" },
	});
	const failure = await Effect.runPromise(
		Effect.flip(
			operations.resolve
				.grammar({
					language: "de",
					sentence: sentenceOf("Er kommt."),
					unit: unitOf([2], "Lexeme/VERB"),
					neighbours: {},
					lemmaCandidates: [],
				})
				.pipe(Effect.provide(liveOver({ jev: fakeJev().ask, luna }))),
		),
	);
	expect(failure).toBeInstanceOf(InvalidModelOutput);
	expect(String(failure.message)).toContain("Luna refused: no");
});
