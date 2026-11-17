import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { v } from "convex/values";
import { assertIdentifier } from "../server/identifiers";
import { components } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";

/**
 * Starting limits on the public entry points that start paid model work:
 * one bucket per Visitor and one global bucket at about ten times that.
 * Tune them later. Each global bucket is split into shards of ten or more
 * units, so concurrent calls by different Visitors mostly write different
 * documents instead of all contending on one.
 */
export const RATE_LIMITS = {
	textSubmission: { kind: "token bucket", rate: 10, period: HOUR },
	textSubmissionGlobal: {
		kind: "token bucket",
		rate: 100,
		period: HOUR,
		shards: 5,
	},
	/**
	 * A Folio of about 3,000 characters takes a few minutes to read, so a
	 * Learner asking for each passage as they go stays far below this.
	 */
	folioRequest: { kind: "token bucket", rate: 30, period: HOUR },
	folioRequestGlobal: {
		kind: "token bucket",
		rate: 300,
		period: HOUR,
		shards: 5,
	},
	segmentSelection: { kind: "token bucket", rate: 60, period: MINUTE },
	segmentSelectionGlobal: {
		kind: "token bucket",
		rate: 600,
		period: MINUTE,
		shards: 10,
	},
	/** Each explanation is asked once for everyone, so this bounds new ones only. */
	pronounExplanation: { kind: "token bucket", rate: 30, period: MINUTE },
	pronounExplanationGlobal: {
		kind: "token bucket",
		rate: 300,
		period: MINUTE,
		shards: 10,
	},
} as const;

const rateLimiter = new RateLimiter(components.rateLimiter, RATE_LIMITS);

type RateLimitedWork =
	| "textSubmission"
	| "folioRequest"
	| "segmentSelection"
	| "pronounExplanation";

/** What a Visitor over the limit reads, given how long to wait. */
const overLimitMessage: Record<RateLimitedWork, (seconds: number) => string> = {
	textSubmission: (seconds) =>
		`Too many texts were submitted recently; try again in ${Math.ceil(seconds / 60)} minutes.`,
	folioRequest: (seconds) =>
		`Too many passages were asked for recently; try again in ${Math.ceil(seconds / 60)} minutes.`,
	segmentSelection: (seconds) =>
		`Too many words were selected recently; try again in ${seconds} seconds.`,
	pronounExplanation: (seconds) =>
		`Too many pronouns were explained recently; try again in ${seconds} seconds.`,
};

/**
 * Consumes one unit of `work` from the Visitor's bucket and the global one,
 * or from neither. Over the limit it returns the message to show instead.
 * The global bucket is consumed with `limit` rather than checked first,
 * since a sharded check and a later `limit` may land on different shards.
 */
export async function consumeRateLimit(
	ctx: MutationCtx,
	work: RateLimitedWork,
	visitorId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const visitor = { key: visitorId };
	const visitorStatus = await rateLimiter.check(ctx, work, visitor);
	const status = visitorStatus.ok
		? await rateLimiter.limit(ctx, `${work}Global`)
		: visitorStatus;
	if (!status.ok) {
		const seconds = Math.max(1, Math.ceil(status.retryAfter / 1_000));
		return { ok: false, message: overLimitMessage[work](seconds) };
	}
	// The check above found room, and nothing else wrote the bucket since.
	await rateLimiter.limit(ctx, work, visitor);
	return { ok: true };
}

export const consumeTextSubmission = internalMutation({
	args: { visitorId: v.string() },
	returns: v.union(
		v.object({ ok: v.literal(true) }),
		v.object({ ok: v.literal(false), message: v.string() }),
	),
	handler: (ctx, { visitorId }) => {
		assertIdentifier(visitorId, "visitorId");
		return consumeRateLimit(ctx, "textSubmission", visitorId);
	},
});
