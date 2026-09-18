"use node";
import {
	createInspectionCapture,
	type InspectionCapture,
} from "../server/inspectionCapture";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { CapturedInspectionStep } from "./model/inspection";

/** Keep one batch well under Convex's argument size limit; payloads are the bulk. */
const MAX_BATCH_PAYLOAD_BYTES = 4 * 1024 * 1024;
const MAX_BATCH_STEPS = 200;

export type ActionInspection = InspectionCapture & {
	readonly flush: () => Promise<void>;
};

function batches(
	steps: readonly CapturedInspectionStep[],
): CapturedInspectionStep[][] {
	const result: CapturedInspectionStep[][] = [];
	let current: CapturedInspectionStep[] = [];
	let bytes = 0;
	for (const step of steps) {
		const size = step.payloadJson.length * 3;
		if (
			current.length > 0 &&
			(current.length >= MAX_BATCH_STEPS ||
				bytes + size > MAX_BATCH_PAYLOAD_BYTES)
		) {
			result.push(current);
			current = [];
			bytes = 0;
		}
		current.push(step);
		bytes += size;
	}
	if (current.length > 0) result.push(current);
	return result;
}

/**
 * Inspection capture for one action run.
 *
 * Whether capture is enabled arrives with the action's arguments; the
 * scheduler decided it inside the mutation that scheduled the run, so tracing
 * adds no hop of its own. Recorded steps are persisted by `flush` in as few
 * mutations as their payload allows, normally one.
 */
export function inspectionFor(
	ctx: ActionCtx,
	requestId: string,
	enabled: boolean,
	scope: "Resolution" | "Knowledge" = "Resolution",
): ActionInspection | undefined {
	if (!enabled) return undefined;
	const capture = createInspectionCapture();
	return Object.assign(capture, {
		async flush() {
			for (const steps of batches(capture.steps.splice(0))) {
				await ctx
					.runMutation(internal.resolutionInspection.recordSteps, {
						requestId,
						scope,
						steps,
					})
					.catch(() =>
						console.warn(
							"Inspection steps could not be saved",
							requestId,
							steps.map((step) => step.id),
						),
					);
			}
		},
	});
}
