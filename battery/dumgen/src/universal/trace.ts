import type { CallTrace, DumgenOptions, OperationTrace } from "../types.js";
import { DumgenFailure } from "./failure.js";
import { task } from "./task.js";

type Context = {
	id: string;
	calls: CallTrace[];
	events: { kind: string; data: unknown }[];
	sequence: number;
};
const contexts = new WeakMap<AbortSignal, Context>();
export function contextFor(signal: AbortSignal): Context {
	const context = contexts.get(signal);
	if (!context) throw Error("Model execution requires an operation scope");
	return context;
}
export function recordEvent(signal: AbortSignal, kind: string, data: unknown) {
	contextFor(signal).events.push({ kind, data });
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

/** Each Effect execution gets its own call graph, including validation failures and interruption. */
export function operationTask(options: DumgenOptions) {
	return <T>(
		stage: string,
		input: unknown,
		run: (signal: AbortSignal) => Promise<T>,
	) =>
		task(stage, async (signal) => {
			const context: Context = {
				id: crypto.randomUUID(),
				calls: [],
				events: [],
				sequence: 0,
			};
			contexts.set(signal, context);
			const startedAt = Date.now();
			const start = performance.now();
			let output: T | undefined;
			let failure: OperationTrace["failure"];
			try {
				signal.throwIfAborted();
				output = await run(signal);
				signal.throwIfAborted();
				return output;
			} catch (error) {
				failure = {
					tag: signal.aborted
						? "Interrupted"
						: error instanceof DumgenFailure
							? error._tag
							: "InvalidModelOutput",
					message:
						error instanceof Error ? error.message : String(error),
				};
				throw error;
			} finally {
				options.onOperation?.({
					version: 2,
					id: context.id,
					operation: stage,
					input,
					generationConfiguration: generationConfiguration(options),
					judgmentConfiguration: judgmentConfiguration(options),
					calls: context.calls,
					events: context.events,
					...(output === undefined ? {} : { output }),
					...(failure ? { failure } : {}),
					outcome: signal.aborted
						? "Interrupted"
						: failure
							? "Failure"
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
				contexts.delete(signal);
			}
		});
}
