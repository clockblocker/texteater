import {
	paginationOptsValidator,
	paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	mutation,
	query,
} from "./_generated/server";
import {
	type CapturedInspectionStep,
	inspectionPayloadChunks,
	inspectionStepValidator,
} from "./model/inspection";
import schema from "./schema";

export async function saveInspectionStep(
	ctx: MutationCtx,
	requestId: string,
	step: CapturedInspectionStep,
) {
	const existing = await ctx.db
		.query("inspectionSteps")
		.withIndex("by_request_id_and_id", (q) =>
			q.eq("requestId", requestId).eq("id", step.id),
		)
		.unique();
	if (existing) return;
	const { payloadJson, ...summary } = step;
	const stepId = await ctx.db.insert("inspectionSteps", {
		requestId,
		...summary,
	});
	const chunks = inspectionPayloadChunks(payloadJson);
	for (const [part, text] of chunks.entries()) {
		await ctx.db.insert("inspectionPayloads", { stepId, part, text });
	}
}

export const enabled = internalQuery({
	args: { requestId: v.string() },
	returns: v.boolean(),
	handler: async (ctx, { requestId }) =>
		!!(await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique()),
});
export const recordStep = internalMutation({
	args: {
		requestId: v.string(),
		scope: v.optional(
			v.union(v.literal("Resolution"), v.literal("Knowledge")),
		),
		step: inspectionStepValidator.extend({ payloadJson: v.string() }),
	},
	returns: v.null(),
	handler: async (ctx, { requestId, step, scope = "Resolution" }) => {
		const click = await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique();
		if (click) {
			let captured = step;
			if (!step.parentId) {
				const session = await ctx.db
					.query("resolutionSessions")
					.withIndex("by_request_id", (q) =>
						q.eq("requestId", requestId),
					)
					.unique();
				const knowledge = await ctx.db
					.query("knowledgeGenerationAttempts")
					.withIndex("by_attempt_key", (q) =>
						q.eq("attemptKey", requestId),
					)
					.unique();
				if (
					(scope === "Knowledge" && knowledge?.state === "Failed") ||
					(scope === "Resolution" &&
						session?.lifecycle.state === "Terminal" &&
						session.lifecycle.outcome === "PermanentFailure")
				)
					captured = { ...step, status: "Failure" };
				await ctx.db.patch(click._id, {
					...(session?.lifecycle.state === "Terminal"
						? {
								resolutionState: session.lifecycle.outcome,
								finishedAt: session.updatedAt,
							}
						: {}),
					...(knowledge ? { knowledgeState: knowledge.state } : {}),
				});
			}
			await saveInspectionStep(ctx, requestId, captured);
		}
		return null;
	},
});
export const list = query({
	args: { visitorId: v.string(), paginationOpts: paginationOptsValidator },
	returns: paginationResultValidator(schema.doc("inspectionClicks")),
	handler: (ctx, args) =>
		ctx.db
			.query("inspectionClicks")
			.withIndex("by_visitor_id_and_started_at", (q) =>
				q.eq("visitorId", args.visitorId),
			)
			.order("desc")
			.paginate(args.paginationOpts),
});
export const detail = query({
	args: { visitorId: v.string(), requestId: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			click: schema.doc("inspectionClicks"),
			state: v.string(),
			finishedAt: v.union(v.number(), v.null()),
			knowledgeState: v.union(v.string(), v.null()),
		}),
	),
	handler: async (ctx, args) => {
		const click = await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique();
		if (!click || click.visitorId !== args.visitorId) return null;
		const session = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique();
		const knowledge = await ctx.db
			.query("knowledgeGenerationAttempts")
			.withIndex("by_attempt_key", (q) =>
				q.eq("attemptKey", args.requestId),
			)
			.unique();
		return {
			click,
			state:
				click.selectionKind === "Available"
					? "Reused"
					: session?.lifecycle.state === "Terminal"
						? session.lifecycle.outcome
						: session
							? session.lifecycle.activity
							: (click.resolutionState ?? "Session removed"),
			finishedAt:
				session?.lifecycle.state === "Terminal"
					? session.updatedAt
					: (click.finishedAt ?? null),
			knowledgeState: knowledge?.state ?? click.knowledgeState ?? null,
		};
	},
});
export const steps = query({
	args: {
		visitorId: v.string(),
		requestId: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginationResultValidator(schema.doc("inspectionSteps")),
	handler: async (ctx, args) => {
		const click = await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique();
		if (!click || click.visitorId !== args.visitorId)
			throw new Error("Inspection not found.");
		return ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) =>
				q.eq("requestId", args.requestId),
			)
			.paginate(args.paginationOpts);
	},
});
export const payload = query({
	args: {
		visitorId: v.string(),
		stepId: v.id("inspectionSteps"),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginationResultValidator(schema.doc("inspectionPayloads")),
	handler: async (ctx, args) => {
		const step = await ctx.db.get(args.stepId);
		if (!step) throw new Error("Step not found.");
		const click = await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", step.requestId),
			)
			.unique();
		if (!click || click.visitorId !== args.visitorId)
			throw new Error("Inspection not found.");
		return ctx.db
			.query("inspectionPayloads")
			.withIndex("by_step_id_and_part", (q) =>
				q.eq("stepId", args.stepId),
			)
			.paginate(args.paginationOpts);
	},
});

/** Browser round-trip timing replaces the transaction-frozen selection clock. */
export const recordSelectionTiming = mutation({
	args: {
		visitorId: v.string(),
		requestId: v.string(),
		startedAt: v.number(),
		durationMs: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		if (
			!Number.isFinite(args.startedAt) ||
			!Number.isFinite(args.durationMs) ||
			args.durationMs < 0 ||
			args.durationMs > 3_600_000
		)
			throw new Error("Invalid selection timing.");
		const click = await ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) =>
				q.eq("requestId", args.requestId),
			)
			.unique();
		if (
			!click ||
			click.visitorId !== args.visitorId ||
			Math.abs(args.startedAt - click.startedAt) > 3_600_000
		)
			return null;
		const step = await ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_id", (q) =>
				q
					.eq("requestId", args.requestId)
					.eq("id", `${args.requestId}:selection`),
			)
			.unique();
		if (step?.timing === "Unmeasured") {
			await ctx.db.patch(step._id, {
				name:
					click.selectionKind === "Available"
						? "Select segment · reuse stored result"
						: "Select segment · schedule resolution",
				owner: "app/tf-demo · browser → Convex (round trip)",
				startedAt: args.startedAt,
				durationMs: args.durationMs,
				timing: undefined,
			});
			await ctx.db.patch(click._id, { startedAt: args.startedAt });
		}
		return null;
	},
});
