import type { OperationTrace } from "dumgen/types";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import {
	type CapturedInspectionStep,
	type InspectionStep,
	inspectionJson,
} from "../convex/model/inspection";

/** A per-action collector: timing is measured before persistence overhead. */
export function createInspectionCapture(parentId = crypto.randomUUID()) {
	const steps: CapturedInspectionStep[] = [];
	let rootStatus: InspectionStep["status"] = "Success";
	function record(
		name: string,
		owner: string,
		startedAt: number,
		durationMs: number,
		input: unknown,
		output: unknown,
		error?: unknown,
		root = false,
		status?: InspectionStep["status"],
	) {
		steps.push({
			id: root ? parentId : crypto.randomUUID(),
			...(root ? {} : { parentId }),
			name,
			owner,
			kind: "Code",
			startedAt,
			durationMs,
			status:
				status ??
				(error === undefined
					? root
						? rootStatus
						: "Success"
					: "Failure"),
			payloadJson: inspectionJson({
				input,
				output,
				...(error === undefined ? {} : { error }),
			}),
		});
	}
	return {
		parentId,
		steps,
		markFailed() {
			rootStatus = "Failure";
		},
		failure(name: string, owner: string, input: unknown, error: unknown) {
			rootStatus = "Failure";
			record(
				name,
				owner,
				Date.now(),
				0,
				input,
				undefined,
				error,
				false,
				"Failure",
			);
		},
		async promise<T>(
			name: string,
			owner: string,
			input: unknown,
			run: () => Promise<T>,
			root = false,
		): Promise<T> {
			const startedAt = Date.now();
			const clock = performance.now();
			try {
				const output = await run();
				record(
					name,
					owner,
					startedAt,
					performance.now() - clock,
					input,
					output,
					undefined,
					root,
				);
				return output;
			} catch (error) {
				record(
					name,
					owner,
					startedAt,
					performance.now() - clock,
					input,
					undefined,
					error,
					root,
					"Failure",
				);
				throw error;
			}
		},
		effect<A, E, R>(
			name: string,
			owner: string,
			input: unknown,
			run: Effect.Effect<A, E, R>,
		): Effect.Effect<A, E, R> {
			return Effect.suspend(() => {
				const startedAt = Date.now();
				const clock = performance.now();
				return run.pipe(
					Effect.onExit((exit) =>
						Effect.sync(() =>
							record(
								name,
								owner,
								startedAt,
								performance.now() - clock,
								input,
								exit._tag === "Success"
									? exit.value
									: undefined,
								exit._tag === "Failure"
									? Cause.squash(exit.cause)
									: undefined,
								false,
								exit._tag === "Failure"
									? Cause.isInterruptedOnly(exit.cause)
										? "Interrupted"
										: "Failure"
									: "Success",
							),
						),
					),
				);
			});
		},
		operation(trace: OperationTrace) {
			// Old traces have no absolute timestamps and cannot form a truthful waterfall.
			if (trace.startedAt === undefined) return;
			steps.push({
				id: trace.id,
				parentId,
				name: trace.operation,
				owner: "battery/dumgen",
				kind: "Code",
				startedAt: trace.startedAt,
				durationMs: trace.durationMs,
				status: trace.outcome,
				payloadJson: inspectionJson({
					input: trace.input,
					output: trace.output,
					failure: trace.failure,
					events: trace.events,
					generationConfiguration: trace.generationConfiguration,
					judgmentConfiguration: trace.judgmentConfiguration,
				}),
			});
			for (const call of trace.calls) {
				if (call.startedAt === undefined) continue;
				steps.push({
					id: call.id,
					parentId: trace.id,
					name: call.request.stage,
					kind: call.executor === "TypeSafe" ? "TypeSafe" : "LLM",
					owner: `battery/promptsmith · ${call.request.configuration.model}`,
					startedAt: call.startedAt,
					durationMs: call.durationMs,
					status:
						call.transport === "Interrupted"
							? "Interrupted"
							: call.transport === "Failure" ||
									call.validation === "Invalid"
								? "Failure"
								: "Success",
					payloadJson: inspectionJson({
						input: call.request,
						output: call.output,
						metadata: call.metadata,
						failure: call.failure,
						validation: call.validation,
						dependsOn: call.dependsOn,
						fingerprint: call.fingerprint,
					}),
				});
			}
		},
	};
}
export type InspectionCapture = ReturnType<typeof createInspectionCapture>;
