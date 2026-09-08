import { recordTrace } from "common-utils/workflow";
import * as Effect from "effect/Effect";
import type { DumgenError } from "../generator/generator-error";
/** Closed production is terminal, including a Catalog Miss. */
export function dispatchProduction<
	Result,
	E = DumgenError,
	R = never,
>(options: {
	readonly closed: boolean;
	readonly runClosed: () => Effect.Effect<Result, E, R>;
	readonly runOpen: () => Effect.Effect<Result, E, R>;
}): Effect.Effect<Result, E, R> {
	return recordTrace("production.route", { closed: options.closed }).pipe(
		Effect.zipRight(
			Effect.suspend(
				options.closed ? options.runClosed : options.runOpen,
			),
		),
	);
}
