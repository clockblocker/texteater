"use node";
import { createInspectionCapture } from "../server/inspectionCapture";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

export async function inspectionFor(
	ctx: ActionCtx,
	requestId: string,
	scope: "Resolution" | "Knowledge" = "Resolution",
) {
	try {
		const enabled: boolean = await ctx.runQuery(
			internal.resolutionInspection.enabled,
			{ requestId },
		);
		if (enabled !== true) return undefined;
	} catch {
		return undefined;
	}
	const capture = createInspectionCapture();
	return Object.assign(capture, {
		async flush() {
			for (const step of capture.steps.splice(0)) {
				await ctx
					.runMutation(internal.resolutionInspection.recordStep, {
						requestId,
						step,
						scope,
					})
					.catch(() =>
						console.warn(
							"Inspection step could not be saved",
							requestId,
							step.id,
						),
					);
			}
		},
	});
}
