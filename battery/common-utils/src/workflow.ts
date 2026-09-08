import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";

export type DumTraceEvent = Readonly<{
	event: string;
	timestamp: number;
	traceId?: string;
	spanId?: string;
	parentSpanId?: string;
	payload?: unknown;
}>;

/** The host owns storage and retention. Sink failure never changes workflow results. */
export interface DumTraceSink {
	readonly record: (event: DumTraceEvent) => Effect.Effect<void, unknown>;
	readonly diagnostic: (message: string, cause?: unknown) => void;
	readonly flush?: () => Effect.Effect<void, unknown>;
	readonly timeoutMs?: number;
	readonly inlinePayloadBytes?: number;
}

export class DumTraceRecorder extends Context.Tag("dum/TraceRecorder")<
	DumTraceRecorder,
	DumTraceSink
>() {}

let artifactSequence = 0;
const secretKey =
	/^(authorization|api[-_]?key|password|secret|access[-_]?token|refresh[-_]?token|cookie|set-cookie)$/i;
function snapshot(value: unknown): unknown {
	const seen = new WeakSet<object>();
	const text = JSON.stringify(value, (key, entry: unknown) => {
		if (secretKey.test(key)) return "[redacted]";
		if (typeof entry === "bigint")
			return { type: "bigint", value: String(entry) };
		if (typeof entry === "function" || typeof entry === "symbol")
			return { omitted: typeof entry };
		if (entry !== null && typeof entry === "object") {
			if (seen.has(entry))
				return { omitted: "circular-or-repeated-reference" };
			seen.add(entry);
			if (entry instanceof Error)
				return {
					...entry,
					name: entry.name,
					message: entry.message,
					stack: entry.stack,
					cause: entry.cause,
				};
		}
		return entry;
	});
	return text === undefined ? { omitted: "undefined" } : JSON.parse(text);
}
function diagnostic(
	sink: DumTraceSink,
	message: string,
	cause?: unknown,
): void {
	try {
		sink.diagnostic(message, cause);
	} catch {
		/* Both destinations failed; no successful recording is claimed. */
	}
}
function deliver(
	sink: DumTraceSink,
	event: DumTraceEvent,
): Effect.Effect<void> {
	return Effect.suspend(() => sink.record(event)).pipe(
		Effect.interruptible,
		Effect.timeoutOption(sink.timeoutMs ?? 100),
		Effect.tap((result) =>
			result._tag === "None"
				? Effect.sync(() =>
						diagnostic(
							sink,
							`Trace recording timed out: ${event.event}`,
						),
					)
				: Effect.void,
		),
		Effect.asVoid,
		Effect.catchAllCause((cause) =>
			Effect.sync(() =>
				diagnostic(
					sink,
					`Trace recording failed: ${event.event}`,
					cause,
				),
			),
		),
	);
}

/** Records an immutable snapshot under the executing fiber's current span. */
export function recordTrace(
	event: string,
	payload?: unknown,
): Effect.Effect<void> {
	return Effect.gen(function* () {
		const option = yield* Effect.serviceOption(DumTraceRecorder);
		if (option._tag === "None") return;
		const sink = option.value;
		const span = yield* Effect.currentSpan.pipe(Effect.option);
		const context: {
			traceId?: string;
			spanId?: string;
			parentSpanId?: string;
		} =
			span._tag === "Some"
				? {
						traceId: span.value.traceId,
						spanId: span.value.spanId,
						...(span.value.parent._tag === "Some"
							? { parentSpanId: span.value.parent.value.spanId }
							: {}),
					}
				: {};
		const timestamp = yield* Effect.clockWith(
			(clock) => clock.currentTimeMillis,
		);
		let captured: unknown;
		try {
			captured = snapshot(payload);
		} catch (cause) {
			diagnostic(
				sink,
				`Trace payload serialization failed: ${event}`,
				cause,
			);
			captured = { omitted: "serialization-failed" };
		}
		const serialized = JSON.stringify(captured);
		if (
			new TextEncoder().encode(serialized).byteLength >
			(sink.inlinePayloadBytes ?? 8192)
		) {
			const artifactId = `${context.spanId ?? "unspanned"}:${timestamp}:${event}:${++artifactSequence}`;
			yield* deliver(sink, {
				event: "artifact",
				timestamp,
				...context,
				payload: { artifactId, value: captured },
			});
			captured = { artifactId };
		}
		yield* deliver(sink, {
			event,
			timestamp,
			...context,
			payload: captured,
		});
	});
}

/** A nested stage inherits trace context and preserves success, failures, defects, and interruption. */
export function traceStage<A, E, R>(
	name: string,
	program: Effect.Effect<A, E, R>,
	input?: unknown,
): Effect.Effect<A, E, R> {
	return Effect.gen(function* () {
		const started = yield* Effect.clockWith(
			(clock) => clock.currentTimeMillis,
		);
		yield* recordTrace(`${name}.started`, { input });
		return yield* program.pipe(
			Effect.onExit((exit) =>
				Effect.gen(function* () {
					const ended = yield* Effect.clockWith(
						(clock) => clock.currentTimeMillis,
					);
					yield* recordTrace(
						`${name}.ended`,
						Exit.isSuccess(exit)
							? {
									outcome: "success",
									durationMs: ended - started,
									output: exit.value,
								}
							: {
									outcome: Cause.isInterruptedOnly(exit.cause)
										? "interrupted"
										: "failure",
									durationMs: ended - started,
									cause: exit.cause,
									description: Cause.pretty(exit.cause),
								},
					);
				}),
			),
		);
	}).pipe(Effect.withSpan(name));
}

/** Provides one host-owned recorder for a run and bounds its final flush, including cancellation. */
export function withTraceRecorder<A, E, R>(
	program: Effect.Effect<A, E, R>,
	sink: DumTraceSink,
): Effect.Effect<A, E, Exclude<R, DumTraceRecorder>> {
	const flush = Effect.suspend(() => sink.flush?.() ?? Effect.void).pipe(
		Effect.interruptible,
		Effect.timeoutOption(sink.timeoutMs ?? 100),
		Effect.tap((result) =>
			result._tag === "None"
				? Effect.sync(() => diagnostic(sink, "Trace flush timed out"))
				: Effect.void,
		),
		Effect.asVoid,
		Effect.catchAllCause((cause) =>
			Effect.sync(() => diagnostic(sink, "Trace flush failed", cause)),
		),
	);
	return program.pipe(
		Effect.provideService(DumTraceRecorder, sink),
		Effect.ensuring(flush),
	);
}
