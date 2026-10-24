import * as Effect from "effect/Effect";
import * as Logger from "effect/Logger";
import { CurrentLogAnnotations } from "effect/References";

/**
 * One logged event as tf-demo writes it: the message's first part names the
 * event, the log annotations are its fields, and `span` is the span it was
 * logged under. The cause is never written: an event carries only the
 * sanitized fields its caller annotated.
 */
export type LogEvent = {
	readonly event: string;
	readonly span?: { readonly name: string; readonly id: string };
	readonly [field: string]: unknown;
};

/** The event a log call describes, read from its fiber. */
export function logEventOf({
	message,
	fiber,
}: Logger.Options<unknown>): LogEvent {
	const [event, ...rest] = Array.isArray(message) ? message : [message];
	const span = fiber.cache.span;
	return {
		event: String(event),
		...(rest.length > 0 ? { message: rest } : {}),
		...fiber.getRef(CurrentLogAnnotations),
		...(span?._tag === "Span"
			? { span: { name: span.name, id: span.spanId } }
			: {}),
	};
}

/**
 * Writes each event as one JSON line through the console method of its
 * level. Convex's dashboard reads the console, so an event stays greppable
 * as `{"event":"KnowledgeGenerationFailed",…}`.
 */
const consoleLogger = Logger.withLeveledConsole(
	Logger.map(Logger.make(logEventOf), (event) => JSON.stringify(event)),
);

/**
 * Runs `effect` with tf-demo's console logger in place of Effect's default
 * one; the tracer logger stays, so a log is an event on its span too.
 */
export function logged<A, E, R>(
	effect: Effect.Effect<A, E, R>,
	logger: Logger.Logger<unknown, unknown> = consoleLogger,
): Effect.Effect<A, E, R> {
	return Effect.provideService(
		effect,
		Logger.CurrentLoggers,
		new Set([logger, Logger.tracerLogger]),
	);
}
