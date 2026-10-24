/**
 * The lifecycle of a Resolution Session and its generation runs: progress,
 * activity, terminal outcomes, failures and the events a run records.
 */
import { v } from "convex/values";

export const resolutionProgressValidator = v.union(
	v.literal("Starting"),
	v.literal("RouteAvailable"),
	v.literal("GrammarAvailable"),
	v.literal("ReadingAvailable"),
	v.literal("Committing"),
);

export const resolutionActivityValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
	v.literal("Terminal"),
);

export const activeResolutionActivityValidator = v.union(
	v.literal("Scheduled"),
	v.literal("Running"),
);

export const resolutionLifecycleValidator = v.union(
	v.object({
		state: v.literal("Active"),
		progress: resolutionProgressValidator,
		activity: activeResolutionActivityValidator,
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: v.literal("Committing"),
		outcome: v.literal("Complete"),
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: resolutionProgressValidator,
		outcome: v.literal("Unresolved"),
	}),
	v.object({
		state: v.literal("Terminal"),
		progress: resolutionProgressValidator,
		outcome: v.literal("PermanentFailure"),
	}),
);

const generationFailureCategoryValidator = v.union(
	v.literal("Network"),
	v.literal("RateLimited"),
	v.literal("ProviderUnavailable"),
	v.literal("RequestRejected"),
	v.literal("InvalidOutput"),
	v.literal("Refusal"),
	v.literal("BudgetExhausted"),
);

export const resolutionFailureCodeValidator = v.union(
	generationFailureCategoryValidator,
	v.literal("CatalogMiss"),
	v.literal("DictionaryConflict"),
	v.literal("MembershipConflict"),
	v.literal("Internal"),
);

export const safeGenerationFailureValidator = v.object({
	category: generationFailureCategoryValidator,
	retryable: v.boolean(),
	status: v.optional(v.number()),
	providerCode: v.optional(v.string()),
	providerRequestId: v.optional(v.string()),
	retryAfterMs: v.optional(v.number()),
	attempts: v.number(),
});

export const resolutionPhaseValidator = v.union(
	v.literal("Route"),
	v.literal("Grammar"),
	v.literal("Reading"),
	v.literal("Commit"),
);

export const resolutionGenerationEventValidator = v.union(
	v.object({
		kind: v.literal("TraceRecorded"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		traceJson: v.string(),
	}),
	v.object({
		kind: v.literal("AttemptStarted"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		attempt: v.number(),
		model: v.string(),
	}),
	v.object({
		kind: v.literal("AttemptFailed"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		failure: safeGenerationFailureValidator,
	}),
	v.object({
		kind: v.literal("RetryScheduled"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		attempt: v.number(),
		delayMs: v.number(),
	}),
	v.object({
		kind: v.literal("Succeeded"),
		requestId: v.string(),
		runToken: v.string(),
		phase: resolutionPhaseValidator,
		attempt: v.number(),
		latencyMs: v.number(),
		providerRequestId: v.optional(v.string()),
	}),
);

export const resolutionRunStateValidator = v.union(
	v.literal("Running"),
	v.literal("Failed"),
	v.literal("Succeeded"),
);
