import * as Cause from "effect/Cause";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import type {
	CallTrace,
	DumgenOptions,
	OperationTrace,
	Task,
} from "../types.js";
import { DumgenFailure } from "./failure.js";

/**
 * One operation's evidence: every call it starts records its CallTrace here,
 * and its steps record free-form events. Calls name their dependencies by the
 * IDs earlier calls returned.
 */
export type OperationScope = {
	readonly id: string;
	readonly calls: CallTrace[];
	readonly events: { kind: string; data: unknown }[];
	sequence: number;
};
/** A finished call's output and the ID its dependents name. */
export type Called<T> = { readonly id: string; readonly output: T };

export function recordEvent(
	scope: OperationScope,
	kind: string,
	data: unknown,
) {
	scope.events.push({ kind, data });
}
export function judgmentConfiguration(options: DumgenOptions) {
	return {
		model: options.judgmentConfiguration?.model ?? "jev-latest",
		settings: {
			timeoutMs: options.judgmentConfiguration?.timeoutMs ?? 10_000,
			maxRetries: 0,
		},
	};
}
export function generationConfiguration(options: DumgenOptions) {
	return {
		model: options.configuration?.model ?? "gpt-5.6-luna",
		settings: {
			reasoning: { effort: "none" },
			...options.configuration?.settings,
			maxRetries: 0,
		},
	};
}

export async function fingerprint(value: unknown): Promise<string> {
	function canonical(input: unknown): unknown {
		if (Array.isArray(input)) return input.map(canonical);
		if (input && typeof input === "object")
			return Object.fromEntries(
				Object.entries(input)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, item]) => [key, canonical(item)]),
			);
		return input;
	}
	const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
	return Array.from(
		new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
		(byte) => byte.toString(16).padStart(2, "0"),
	).join("");
}

/**
 * One model or judgment call as its own Effect. Interruption aborts the
 * transport's signal, then waits until the call has settled and recorded its
 * CallTrace, so no call outlives its operation's trace. A DumgenFailure is the
 * call's failure; any other rejection is a defect.
 */
export function call<T>(
	run: (signal: AbortSignal) => Promise<T>,
): Effect.Effect<T, DumgenFailure> {
	return Effect.async<T, DumgenFailure>((resume, signal) => {
		const pending = Promise.resolve()
			.then(() => run(signal))
			.then(
				(value) => resume(Effect.succeed(value)),
				(error) =>
					resume(
						error instanceof DumgenFailure
							? Effect.fail(error as DumgenFailure)
							: Effect.die(error),
					),
			);
		return Effect.promise(() => pending);
	});
}

/**
 * Effect.gen turns a thrown DumgenFailure into a defect. Only a DumgenFailure
 * is an expected failure, so this restores it; any other defect stays one.
 */
export function expected<T, R>(
	effect: Effect.Effect<T, DumgenFailure, R>,
): Effect.Effect<T, DumgenFailure, R> {
	return Effect.catchAllCause(effect, (cause) => {
		const defects = Chunk.toReadonlyArray(Cause.defects(cause));
		const [first] = defects;
		return first instanceof DumgenFailure &&
			defects.every((defect) => defect instanceof DumgenFailure)
			? Effect.fail(first as DumgenFailure)
			: Effect.failCause(cause);
	});
}

function failureOf(
	cause: Cause.Cause<DumgenFailure>,
): NonNullable<OperationTrace["failure"]> {
	const failure = Cause.failureOption(cause);
	if (Option.isSome(failure))
		return { tag: failure.value._tag, message: failure.value.message };
	const [defect] = Chunk.toReadonlyArray(Cause.defects(cause));
	if (defect !== undefined)
		return {
			tag: "Defect",
			message: defect instanceof Error ? defect.message : String(defect),
		};
	return { tag: "Interrupted", message: "The operation was interrupted" };
}

/**
 * Each run of the returned Effect gets its own scope. Its OperationTrace is
 * emitted once the run has ended and every call it started has settled.
 */
export function operation(options: DumgenOptions) {
	return <T>(
		stage: string,
		input: unknown,
		run: (scope: OperationScope) => Effect.Effect<T, DumgenFailure>,
	): Task<T> =>
		Effect.suspend(() => {
			const scope: OperationScope = {
				id: crypto.randomUUID(),
				calls: [],
				events: [],
				sequence: 0,
			};
			const startedAt = Date.now();
			const start = performance.now();
			return expected(Effect.suspend(() => run(scope))).pipe(
				Effect.onExit((exit) =>
					Effect.sync(() => {
						const output = Exit.isSuccess(exit)
							? exit.value
							: undefined;
						const failure = Exit.isFailure(exit)
							? failureOf(exit.cause)
							: undefined;
						options.onOperation?.({
							version: 2,
							id: scope.id,
							operation: stage,
							input,
							generationConfiguration:
								generationConfiguration(options),
							judgmentConfiguration:
								judgmentConfiguration(options),
							calls: scope.calls,
							events: scope.events,
							...(output === undefined ? {} : { output }),
							...(failure ? { failure } : {}),
							outcome: failure
								? failure.tag === "Interrupted"
									? "Interrupted"
									: "Failure"
								: output &&
										typeof output === "object" &&
										"failures" in output &&
										Array.isArray(output.failures) &&
										output.failures.length
									? "Partial"
									: "Success",
							startedAt,
							durationMs: performance.now() - start,
						});
					}),
				),
			);
		});
}
