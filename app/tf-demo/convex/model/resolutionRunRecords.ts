import { assertIdentifier } from "../../server/identifiers";
import {
	assertSafeGenerationFailure,
	type GenerationFailure,
	publicFailureMessage,
	type ResolutionGenerationEvent,
} from "../../server/resolutionFailure";
import {
	assertOperationalString,
	guardMatches,
	RESOLUTION_RETENTION_MS,
	type ResolutionFailureCode,
	type ResolutionPhase,
	type ResolutionSessionGuard,
} from "../../server/resolutionLifecycle";
import type { MutationCtx } from "../_generated/server";
import { settleResolutionSession } from "./resolutionSessionEndings";
import {
	findResolutionSession,
	type ResolutionSession,
} from "./resolutionSessionRow";

/*
 * The record each Resolution Session run leaves in `resolutionRuns`: its
 * phase, its state, and how it failed. A failed run also ends its session.
 */

export async function recordResolutionRunSuccess(
	ctx: MutationCtx,
	args: {
		readonly guard: ResolutionSessionGuard;
		readonly phase: ResolutionPhase;
		readonly generationEvents?: readonly ResolutionGenerationEvent[];
	},
): Promise<boolean> {
	const session = await findResolutionSession(ctx, args.guard.requestId);
	if (!session || !guardMatches(session, args.guard)) return false;
	await upsertResolutionRun(ctx, session, {
		phase: args.phase,
		state: "Succeeded",
		...(args.generationEvents
			? { generationEvents: args.generationEvents }
			: {}),
	});
	return true;
}

export type ResolutionRunFailure =
	| {
			readonly kind: "Generation";
			readonly phase: ResolutionPhase;
			readonly failure: GenerationFailure;
			readonly generationEvents?: readonly ResolutionGenerationEvent[];
	  }
	| {
			readonly kind: "Internal";
			readonly phase: ResolutionPhase;
			readonly diagnosticId: string;
			readonly errorName: string;
			readonly errorFingerprint: string;
			readonly generationEvents?: readonly ResolutionGenerationEvent[];
	  };

/**
 * A failed run ends its session: tf-demo never retries a failure itself. A
 * run whose guard went stale records nothing.
 */
export async function failResolutionRun(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
	failure: ResolutionRunFailure,
): Promise<boolean> {
	const session = await findResolutionSession(ctx, guard.requestId);
	if (
		!session ||
		!guardMatches(session, guard) ||
		session.lifecycle.state === "Terminal"
	) {
		return false;
	}
	const generationEvents = failure.generationEvents
		? { generationEvents: failure.generationEvents }
		: {};
	if (failure.kind === "Generation") {
		assertSafeGenerationFailure(failure.failure);
		const diagnosticId = crypto.randomUUID();
		await upsertResolutionRun(ctx, session, {
			phase: failure.phase,
			state: "Failed",
			failure: failure.failure,
			failureCode: failure.failure.category,
			diagnosticId,
			...generationEvents,
		});
		await settleResolutionSession(ctx, session, {
			kind: "PermanentFailure",
			message: publicFailureMessage(
				failure.phase,
				failure.failure.category,
			),
			failureCode: failure.failure.category,
			diagnosticId,
		});
		return true;
	}
	assertIdentifier(failure.diagnosticId, "diagnosticId");
	assertOperationalString(failure.errorName, "errorName");
	assertOperationalString(failure.errorFingerprint, "errorFingerprint");
	await upsertResolutionRun(ctx, session, {
		phase: failure.phase,
		state: "Failed",
		failureCode: "Internal",
		diagnosticId: failure.diagnosticId,
		errorName: failure.errorName,
		errorFingerprint: failure.errorFingerprint,
		...generationEvents,
	});
	await settleResolutionSession(ctx, session, {
		kind: "PermanentFailure",
		message: "Resolution could not be completed.",
		failureCode: "Internal",
		diagnosticId: failure.diagnosticId,
	});
	return true;
}

type ResolutionRunUpdate = {
	readonly phase: ResolutionPhase;
	readonly state: "Running" | "Failed" | "Succeeded";
	readonly failure?: GenerationFailure;
	readonly failureCode?: ResolutionFailureCode;
	readonly diagnosticId?: string;
	readonly errorName?: string;
	readonly errorFingerprint?: string;
	readonly generationEvents?: readonly ResolutionGenerationEvent[];
};

export async function upsertResolutionRun(
	ctx: MutationCtx,
	session: ResolutionSession,
	update: ResolutionRunUpdate,
): Promise<void> {
	const now = Date.now();
	const run = await ctx.db
		.query("resolutionRuns")
		.withIndex("by_request_id_and_run_token", (q) =>
			q
				.eq("requestId", session.requestId)
				.eq("runToken", session.runToken),
		)
		.unique();
	const values = {
		phase: update.phase,
		state: update.state,
		...(update.failure ? { failure: update.failure } : {}),
		...(update.failureCode ? { failureCode: update.failureCode } : {}),
		...(update.diagnosticId ? { diagnosticId: update.diagnosticId } : {}),
		...(update.errorName ? { errorName: update.errorName } : {}),
		...(update.errorFingerprint
			? { errorFingerprint: update.errorFingerprint }
			: {}),
		...(update.generationEvents
			? { generationEvents: [...update.generationEvents] }
			: {}),
		...(update.state === "Running" ? {} : { finishedAt: now }),
		expiresAt: now + RESOLUTION_RETENTION_MS,
	};
	if (run) {
		await ctx.db.patch(run._id, values);
		return;
	}
	await ctx.db.insert("resolutionRuns", {
		requestId: session.requestId,
		runToken: session.runToken,
		runNumber: session.runNumber ?? 1,
		startedAt: now,
		...values,
	});
}
