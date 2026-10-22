import type * as Effect from "effect/Effect";
import * as Logger from "effect/Logger";
import { type LogEvent, logEventOf, logged } from "../../server/logging";

/**
 * A Logger that keeps each event with its level instead of writing it, and
 * runs an Effect with it in place of tf-demo's console logger.
 */
export function capturedLogs() {
	const events: (LogEvent & { readonly level: string })[] = [];
	const logger = Logger.make((options) => {
		events.push({ level: options.logLevel, ...logEventOf(options) });
	});
	return {
		events,
		capture: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
			logged(effect, logger),
	};
}
