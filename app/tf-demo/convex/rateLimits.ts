import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";

/**
 * Starting limits on the public entry points that start paid model work:
 * one bucket per Visitor and one global bucket at about ten times that.
 * Tune them later.
 */
export const RATE_LIMITS = {
	textSubmission: { kind: "token bucket", rate: 10, period: HOUR },
	textSubmissionGlobal: { kind: "token bucket", rate: 100, period: HOUR },
	segmentSelection: { kind: "token bucket", rate: 60, period: MINUTE },
	segmentSelectionGlobal: { kind: "token bucket", rate: 600, period: MINUTE },
} as const;

const rateLimiter = new RateLimiter(components.rateLimiter, RATE_LIMITS);

type RateLimitedWork = "textSubmission" | "segmentSelection";

/**
 * Consumes one unit of `work` from the Visitor's bucket and the global one,
 * or from neither. Over the limit it returns the message to show instead.
 */
export async function consumeRateLimit(
	ctx: MutationCtx,
	work: RateLimitedWork,
	visitorId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const visitor = { key: visitorId };
	const global = `${work}Global` as const;
	const statuses = [
		await rateLimiter.check(ctx, work, visitor),
		await rateLimiter.check(ctx, global),
	];
	const retryAfter = Math.max(
		...statuses.map((status) => (status.ok ? 0 : status.retryAfter)),
	);
	if (statuses.some((status) => !status.ok)) {
		const seconds = Math.max(1, Math.ceil(retryAfter / 1_000));
		return {
			ok: false,
			message:
				work === "textSubmission"
					? `Too many texts were submitted recently; try again in ${Math.ceil(seconds / 60)} minutes.`
					: `Too many words were selected recently; try again in ${seconds} seconds.`,
		};
	}
	await rateLimiter.limit(ctx, work, visitor);
	await rateLimiter.limit(ctx, global);
	return { ok: true };
}

export const consumeTextSubmission = internalMutation({
	args: { visitorId: v.string() },
	returns: v.union(
		v.object({ ok: v.literal(true) }),
		v.object({ ok: v.literal(false), message: v.string() }),
	),
	handler: (ctx, { visitorId }) => {
		if (visitorId.trim().length === 0 || visitorId.length > 200)
			throw new Error("visitorId must contain 1 to 200 characters.");
		return consumeRateLimit(ctx, "textSubmission", visitorId);
	},
});
