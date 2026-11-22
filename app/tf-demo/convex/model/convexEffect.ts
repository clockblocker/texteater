"use node";

import type {
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { ConvexError, type Value } from "convex/values";
import type { OperationTrace } from "dumgen";
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import {
	dumgenTraced,
	inspected,
	inspectionStep,
} from "../../server/inspectionCapture";
import { logged } from "../../server/logging";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import type { ActionInspection } from "./inspectionAction";
import { visitorError } from "./validators";

/**
 * The Convex-Action-to-Effect runtime boundary for tf-demo Node actions:
 * - `VisitorActionError`: typed domain error inside Effect, translated to a
 *   coded `ConvexError` once at the action edge.
 * - `ConvexActionCtx`: thin `Context.Service` exposing `runQuery`,
 *   `runMutation`, and `storage` as Effects inside the fiber tree so DB hops
 *   inherit Effect spans and interruption natively.
 * - `runConvexEffect`: the single edge runner that installs `dumgenTraced`,
 *   `logged`, `inspected`, and `ConvexActionCtx`, guarantees
 *   `inspection?.flush()` via `Effect.ensuring`, and maps `VisitorActionError`
 *   to `ConvexError`.
 */

export const VisitorErrorCode = Schema.Literals([
	"Conflict",
	"InvalidInput",
	"NotConfigured",
	"RateLimited",
]);

/**
 * A typed visitor-facing condition raised inside Effect code. Translated to a
 * coded `ConvexError` once at the Convex action boundary (`runConvexEffect`).
 */
export class VisitorActionError extends Schema.TaggedError<
	VisitorActionError,
	{ readonly brand: unique symbol }
>()("VisitorActionError", {
	code: VisitorErrorCode,
	visitorMessage: Schema.String,
}) {
	override get message(): string {
		return this.visitorMessage;
	}
}

export const isVisitorActionError = Schema.is(VisitorActionError);

/** Minimal Convex action context needed by Effect-backed actions and tests. */
export type ConvexActionContext = Pick<ActionCtx, "runQuery" | "runMutation"> &
	Partial<Pick<ActionCtx, "storage">>;

/**
 * Convex `ActionCtx` exposed as an Effect service so `runQuery`, `runMutation`,
 * and `storage` hops stay inside the Effect fiber tree and inherit spans and
 * interruption natively.
 */
export class ConvexActionCtx extends Context.Service<
	ConvexActionCtx,
	{
		readonly runQuery: <
			Query extends FunctionReference<"query", "public" | "internal">,
		>(
			query: Query,
			...args: OptionalRestArgs<Query>
		) => Effect.Effect<FunctionReturnType<Query>, Cause.UnknownError>;
		readonly runMutation: <
			Mutation extends FunctionReference<
				"mutation",
				"public" | "internal"
			>,
		>(
			mutation: Mutation,
			...args: OptionalRestArgs<Mutation>
		) => Effect.Effect<FunctionReturnType<Mutation>, Cause.UnknownError>;
		readonly storage: {
			readonly get: (
				storageId: Id<"_storage">,
			) => Effect.Effect<Blob | null, Cause.UnknownError>;
			readonly store: (
				blob: Blob,
			) => Effect.Effect<Id<"_storage">, Cause.UnknownError>;
			readonly delete: (
				storageId: Id<"_storage">,
			) => Effect.Effect<void, Cause.UnknownError>;
		};
	}
>()("tf-demo/convex/ConvexActionCtx") {}

function makeConvexActionCtx(
	ctx: ConvexActionContext,
): ConvexActionCtx["Service"] {
	const requireStorage = (): Effect.Effect<
		NonNullable<ConvexActionContext["storage"]>,
		Cause.UnknownError
	> => {
		if (!ctx.storage) {
			return Effect.fail(
				new Cause.UnknownError(
					new Error(
						"Convex action storage is unavailable in this context.",
					),
				),
			);
		}
		return Effect.succeed(ctx.storage);
	};

	return ConvexActionCtx.of({
		runQuery: (query, ...args) =>
			Effect.tryPromise(() => ctx.runQuery(query, ...args)).pipe(
				Effect.withSpan("ConvexActionCtx.runQuery"),
			),
		runMutation: (mutation, ...args) =>
			Effect.tryPromise(() => ctx.runMutation(mutation, ...args)).pipe(
				Effect.withSpan("ConvexActionCtx.runMutation"),
			),
		storage: {
			get: (storageId) =>
				requireStorage().pipe(
					Effect.flatMap((storage) =>
						Effect.tryPromise(() => storage.get(storageId)),
					),
					Effect.withSpan("ConvexActionCtx.storage.get"),
				),
			store: (blob) =>
				requireStorage().pipe(
					Effect.flatMap((storage) =>
						Effect.tryPromise(() => storage.store(blob)),
					),
					Effect.withSpan("ConvexActionCtx.storage.store"),
				),
			delete: (storageId) =>
				requireStorage().pipe(
					Effect.flatMap((storage) =>
						Effect.tryPromise(() => storage.delete(storageId)),
					),
					Effect.withSpan("ConvexActionCtx.storage.delete"),
				),
		},
	});
}

function layerConvexActionCtx(
	ctx: ConvexActionContext,
): Layer.Layer<ConvexActionCtx> {
	return Layer.succeed(ConvexActionCtx, makeConvexActionCtx(ctx));
}

/** Runs a Convex query inside the current fiber as a named inspection step. */
export function inspectedQuery<
	Query extends FunctionReference<"query", "public" | "internal">,
>(
	name: string,
	owner: string,
	input: unknown,
	query: Query,
	...args: OptionalRestArgs<Query>
): Effect.Effect<
	FunctionReturnType<Query>,
	Cause.UnknownError,
	ConvexActionCtx
> {
	return ConvexActionCtx.use((ctx) => ctx.runQuery(query, ...args)).pipe(
		Effect.withSpan(name, inspectionStep(owner, input)),
	);
}

/** Runs a Convex mutation inside the current fiber as a named inspection step. */
export function inspectedMutation<
	Mutation extends FunctionReference<"mutation", "public" | "internal">,
>(
	name: string,
	owner: string,
	input: unknown,
	mutation: Mutation,
	...args: OptionalRestArgs<Mutation>
): Effect.Effect<
	FunctionReturnType<Mutation>,
	Cause.UnknownError,
	ConvexActionCtx
> {
	return ConvexActionCtx.use((ctx) =>
		ctx.runMutation(mutation, ...args),
	).pipe(Effect.withSpan(name, inspectionStep(owner, input)));
}

/**
 * Extracts a visitor-facing error from a failed Effect cause: either a typed
 * `VisitorActionError` (mapped once here to a coded `ConvexError`) or a
 * `ConvexError` already thrown by a Convex hop.
 */
function visitorErrorIn(
	cause: Cause.Cause<unknown>,
): ConvexError<Value> | undefined {
	for (const reason of cause.reasons) {
		const value = Cause.isFailReason(reason)
			? reason.error
			: Cause.isDieReason(reason)
				? reason.defect
				: undefined;
		if (value === undefined) continue;
		const unwrapped = Cause.isUnknownError(value) ? value.cause : value;
		if (isVisitorActionError(unwrapped))
			return visitorError(unwrapped.code, unwrapped.visitorMessage);
		if (unwrapped instanceof ConvexError) return unwrapped;
	}
	return undefined;
}

export type RunConvexEffectOptions = {
	readonly inspection?: ActionInspection | undefined;
	readonly traceSink?: ((trace: OperationTrace) => void) | undefined;
};

/**
 * Runs an Effect program at a Convex action boundary.
 *
 * Installs `dumgenTraced`, `logged`, `inspected`, and `ConvexActionCtx`,
 * guarantees `inspection?.flush()` via `Effect.ensuring` after the program's
 * root span closes, and maps any `VisitorActionError` to a coded `ConvexError`
 * once at the boundary.
 */
export async function runConvexEffect<A, E>(
	ctx: ConvexActionContext,
	effect: Effect.Effect<A, E, ConvexActionCtx>,
	options: RunConvexEffectOptions = {},
): Promise<A> {
	const { inspection, traceSink } = options;
	const program = inspected(
		logged(dumgenTraced(inspection, traceSink)(effect)),
		inspection,
	).pipe(
		Effect.provide(layerConvexActionCtx(ctx)),
		Effect.ensuring(
			inspection ? Effect.promise(() => inspection.flush()) : Effect.void,
		),
	);
	const exit = await Effect.runPromiseExit(program);
	if (Exit.isSuccess(exit)) return exit.value;
	throw visitorErrorIn(exit.cause) ?? Cause.squash(exit.cause);
}
