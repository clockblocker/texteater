import { expect, test } from "bun:test";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import {
	type DumTraceEvent,
	type DumTraceSink,
	recordTrace,
	traceStage,
	withTraceRecorder,
} from "../src/workflow";

function capture() {
	const events: DumTraceEvent[] = [];
	const diagnostics: string[] = [];
	return {
		events,
		diagnostics,
		sink: {
			record: (event: DumTraceEvent) =>
				Effect.sync(() => {
					events.push(event);
				}),
			diagnostic: (message: string) => {
				diagnostics.push(message);
			},
		},
	};
}
test("nested stages correlate and payloads snapshot and redact", async () => {
	const c = capture();
	const input = { value: 1, apiKey: "private" };
	await Effect.runPromise(
		withTraceRecorder(
			traceStage(
				"run",
				Effect.gen(function* () {
					yield* recordTrace("input", input);
					input.value = 2;
					yield* traceStage("child", Effect.succeed("done"));
				}),
			),
			c.sink,
		),
	);
	expect(c.events.find((e) => e.event === "input")?.payload).toEqual({
		value: 1,
		apiKey: "[redacted]",
	});
	expect(new Set(c.events.map((e) => e.traceId)).size).toBe(1);
	expect(
		c.events.find((e) => e.event === "child.started")?.parentSpanId,
	).toBe(c.events[0]?.spanId);
});
test("typed failure survives recorder defects and flush failure", async () => {
	const c = capture();
	const failure = { _tag: "Expected" };
	const exit = await Effect.runPromiseExit(
		withTraceRecorder(traceStage("run", Effect.fail(failure)), {
			...c.sink,
			record: () => Effect.die("broken sink"),
			flush: () => Effect.fail("broken flush"),
		}),
	);
	expect(Exit.isFailure(exit)).toBe(true);
	if (Exit.isFailure(exit)) expect(exit.cause._tag).toBe("Fail");
	expect(c.diagnostics.some((d) => d.includes("recording failed"))).toBe(
		true,
	);
	expect(c.diagnostics.some((d) => d.includes("flush failed"))).toBe(true);
});
test("hung recorder and cleanup are bounded", async () => {
	const c = capture();
	const result = await Effect.runPromise(
		withTraceRecorder(traceStage("run", Effect.succeed(42)), {
			...c.sink,
			record: () => Effect.never,
			flush: () => Effect.never,
			timeoutMs: 5,
		}),
	);
	expect(result).toBe(42);
	expect(c.diagnostics).toHaveLength(3);
});
test("large payload artifacts and serialization gaps are explicit", async () => {
	const c = capture();
	const invalid = {
		get value() {
			throw new Error("getter failed");
		},
	};
	await Effect.runPromise(
		withTraceRecorder(
			Effect.gen(function* () {
				yield* recordTrace("large", "x".repeat(100));
				yield* recordTrace("bad", invalid);
			}),
			{ ...c.sink, inlinePayloadBytes: 50 },
		),
	);
	const artifact = c.events.find((e) => e.event === "artifact");
	expect(artifact).toBeDefined();
	if (!artifact) throw new Error("Missing artifact");
	expect(c.events.find((e) => e.event === "large")?.payload).toEqual({
		artifactId: (artifact.payload as { artifactId: string }).artifactId,
	});
	expect(c.events.find((e) => e.event === "bad")?.payload).toEqual({
		omitted: "serialization-failed",
	});
	expect(c.diagnostics).toHaveLength(1);
});
test("interruption records outcome and flushes", async () => {
	const c = capture();
	let flushed = false;
	const controller = new AbortController();
	let started!: () => void;
	const ready = new Promise<void>((resolve) => {
		started = resolve;
	});
	const run = Effect.runPromiseExit(
		withTraceRecorder(
			traceStage(
				"run",
				Effect.sync(started).pipe(Effect.zipRight(Effect.never)),
			),
			{
				...c.sink,
				flush: () =>
					Effect.sync(() => {
						flushed = true;
					}),
			},
		),
		{ signal: controller.signal },
	);
	await ready;
	controller.abort();
	await run;
	expect(
		c.events.some(
			(e) =>
				e.event === "run.ended" &&
				(e.payload as { outcome: string }).outcome === "interrupted",
		),
	).toBe(true);
	expect(flushed).toBe(true);
});

test("interrupting a pending recorder prevents subsequent workflow work", async () => {
	const result = await Effect.runPromise(
		Effect.gen(function* () {
			const ready = yield* Deferred.make<void>();
			let continued = false;
			const sink: DumTraceSink = {
				record: () =>
					Deferred.succeed(ready, undefined).pipe(
						Effect.zipRight(Effect.never),
					),
				diagnostic: () => {},
				timeoutMs: 10000,
			};
			const fiber = yield* Effect.fork(
				withTraceRecorder(
					recordTrace("pending").pipe(
						Effect.zipRight(
							Effect.sync(() => {
								continued = true;
							}),
						),
					),
					sink,
				),
			);
			yield* Deferred.await(ready);
			const exit = yield* Fiber.interrupt(fiber);
			return { exit, continued };
		}),
	);
	expect(result.continued).toBe(false);
	expect(result.exit._tag).toBe("Failure");
});
