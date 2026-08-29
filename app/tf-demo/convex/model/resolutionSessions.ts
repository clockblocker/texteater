import { type Infer, v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export {
	projectResolutionGrammar,
	projectResolutionReading,
} from "../../server/resolutionSessionProjection";

import {
	resolutionActivityValidator,
	resolutionGrammarProjectionValidator,
	type resolutionLifecycleValidator,
	resolutionOutcomeValidator,
	resolutionProgressValidator,
	resolutionReadingProjectionValidator,
	type resolutionSessionGuardValidator,
} from "./validators";

const MAX_IDENTIFIER_LENGTH = 200;

export type ResolutionProgress = Infer<typeof resolutionProgressValidator>;
export type ResolutionActivity = Infer<typeof resolutionActivityValidator>;
export type ResolutionOutcome = Infer<typeof resolutionOutcomeValidator>;
export type ResolutionLifecycle = Infer<typeof resolutionLifecycleValidator>;
export type ResolutionSessionGuard = Infer<
	typeof resolutionSessionGuardValidator
>;
export type ResolutionGrammarProjection = Infer<
	typeof resolutionGrammarProjectionValidator
>;
export type ResolutionReadingProjection = Infer<
	typeof resolutionReadingProjectionValidator
>;

const progressPosition: Readonly<Record<ResolutionProgress, number>> = {
	Starting: 0,
	RouteAvailable: 1,
	GrammarAvailable: 2,
	ReadingAvailable: 3,
	Committing: 4,
};

export type ResolutionLifecycleSource = {
	readonly lifecycle: ResolutionLifecycle;
};

export function assertResolutionLifecycle(
	value: unknown,
): asserts value is ResolutionLifecycle {
	if (!value || typeof value !== "object") {
		throw new Error("Resolution lifecycle must be an object.");
	}
	const lifecycle = value as Record<string, unknown>;
	if (!isResolutionProgress(lifecycle.progress)) {
		throw new Error("Resolution lifecycle progress is invalid.");
	}
	if (lifecycle.state === "Active") {
		if (
			!isActiveResolutionActivity(lifecycle.activity) ||
			"outcome" in lifecycle
		) {
			throw new Error(
				"An active Resolution lifecycle requires an active activity and no outcome.",
			);
		}
		return;
	}
	if (lifecycle.state !== "Terminal" || "activity" in lifecycle) {
		throw new Error(
			"A terminal Resolution lifecycle cannot have activity.",
		);
	}
	if (
		lifecycle.outcome !== "Complete" &&
		lifecycle.outcome !== "Unresolved" &&
		lifecycle.outcome !== "PermanentFailure"
	) {
		throw new Error("A terminal Resolution lifecycle requires an outcome.");
	}
	if (
		lifecycle.outcome === "Complete" &&
		lifecycle.progress !== "Committing"
	) {
		throw new Error("Complete requires Committing progress.");
	}
}

export const resolutionNoteValidator = v.object({
	kind: v.literal("ResolutionNote"),
	target: v.object({
		kind: v.literal("Resolution"),
		requestId: v.string(),
	}),
	progress: resolutionProgressValidator,
	activity: resolutionActivityValidator,
	outcome: v.optional(resolutionOutcomeValidator),
	route: v.object({
		textId: v.id("texts"),
		sentenceId: v.id("sentences"),
		stitchedText: v.string(),
		clickedSegmentIndex: v.number(),
		selectedSegment: v.string(),
	}),
	grammar: v.optional(resolutionGrammarProjectionValidator),
	reading: v.optional(resolutionReadingProjectionValidator),
	terminal: v.optional(
		v.union(
			v.object({
				kind: v.literal("Complete"),
				attestationId: v.id("attestations"),
				canonical: v.optional(
					v.object({
						readingId: v.id("readings"),
						lemmaId: v.id("lemmas"),
						surfaceId: v.id("surfaces"),
						attestationId: v.id("attestations"),
					}),
				),
				target: v.union(
					v.object({
						kind: v.literal("UnitReadingNote"),
						readingId: v.id("readings"),
					}),
					v.object({
						kind: v.literal("RouteNote"),
						routeKind: v.literal("Attestation"),
						id: v.id("attestations"),
					}),
				),
			}),
			v.object({ kind: v.literal("Unresolved") }),
			v.object({
				kind: v.literal("PermanentFailure"),
				failureCode: v.string(),
				diagnosticId: v.string(),
				message: v.string(),
			}),
		),
	),
	updatedAt: v.number(),
});

export type ResolutionNote = Infer<typeof resolutionNoteValidator>;

export function assertResolutionProgressTransition(
	current: ResolutionProgress,
	next: ResolutionProgress,
): void {
	if (current === next) return;
	if (progressPosition[next] !== progressPosition[current] + 1) {
		throw new Error(
			`Resolution Session progress ${next} cannot follow ${current}.`,
		);
	}
}

export function resolutionProgressHasReached(
	current: ResolutionProgress,
	target: ResolutionProgress,
): boolean {
	return progressPosition[current] > progressPosition[target];
}

export async function loadResolutionNote(
	ctx: QueryCtx,
	requestId: string,
): Promise<ResolutionNote | null> {
	if (requestId.length === 0 || requestId.length > MAX_IDENTIFIER_LENGTH) {
		return null;
	}
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
	if (!session) return null;
	const { lifecycle } = session;
	const activity =
		lifecycle.state === "Active" ? lifecycle.activity : "Terminal";
	const outcome =
		lifecycle.state === "Terminal" ? lifecycle.outcome : undefined;
	const canonical =
		outcome === "Complete" && session.readingId && session.attestationId
			? await loadCanonicalResolution(
					ctx,
					session.readingId,
					session.attestationId,
				)
			: null;
	return {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId },
		progress: lifecycle.progress,
		activity,
		...(outcome ? { outcome } : {}),
		route: session.route,
		...(session.grammar ? { grammar: session.grammar } : {}),
		...(session.reading ? { reading: session.reading } : {}),
		...(outcome === "Complete" && session.readingId && session.attestationId
			? {
					terminal: {
						kind: "Complete" as const,
						attestationId: session.attestationId,
						...(canonical ? { canonical } : {}),
						target: session.routeNoteRequested
							? {
									kind: "RouteNote" as const,
									routeKind: "Attestation" as const,
									id: session.attestationId,
								}
							: {
									kind: "UnitReadingNote" as const,
									readingId: session.readingId,
								},
					},
				}
			: outcome === "Unresolved"
				? { terminal: { kind: "Unresolved" as const } }
				: outcome === "PermanentFailure"
					? {
							terminal: {
								kind: "PermanentFailure" as const,
								failureCode: session.failureCode ?? "Internal",
								diagnosticId:
									session.diagnosticId ?? session.requestId,
								message:
									session.failureMessage ??
									"Resolution could not be completed.",
							},
						}
					: {}),
		updatedAt: session.updatedAt,
	};
}

async function loadCanonicalResolution(
	ctx: QueryCtx,
	readingId: Id<"readings">,
	attestationId: Id<"attestations">,
) {
	const [reading, attestation] = await Promise.all([
		ctx.db.get(readingId),
		ctx.db.get(attestationId),
	]);
	if (!reading || !attestation) return null;
	return {
		readingId,
		lemmaId: reading.lemmaId,
		surfaceId: attestation.surfaceId,
		attestationId,
	};
}

export async function requireActiveResolutionSession(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
) {
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", guard.requestId))
		.unique();
	if (
		!session ||
		session.runToken !== guard.runToken ||
		session.segmentId !== guard.segmentId ||
		session.lifecycle.state === "Terminal"
	) {
		throw new Error("Resolution Session is no longer active.");
	}
	const segment = await ctx.db.get(guard.segmentId);
	if (
		!segment ||
		segment.sentenceId !== session.sentenceId ||
		segment.index !== session.clickedSegmentIndex ||
		segment.kind !== "ResolvableText"
	) {
		throw new Error(
			"Resolution Session source Segment is no longer valid.",
		);
	}
	return session;
}

export async function settleComplete(
	ctx: MutationCtx,
	session: ResolutionLifecycleSource & { _id: Id<"resolutionSessions"> },
	result: {
		readingId: Id<"readings">;
		attestationId: Id<"attestations">;
		grammar: ResolutionGrammarProjection;
		reading: ResolutionReadingProjection;
	},
): Promise<void> {
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		},
		grammar: result.grammar,
		reading: result.reading,
		readingId: result.readingId,
		attestationId: result.attestationId,
		failureMessage: undefined,
		failureCode: undefined,
		diagnosticId: undefined,
		nextRetryAt: undefined,
		updatedAt: Date.now(),
	});
}

export async function settleUnresolved(
	ctx: MutationCtx,
	session: ResolutionLifecycleSource & { _id: Id<"resolutionSessions"> },
): Promise<void> {
	const progress = session.lifecycle.progress;
	await ctx.db.patch(session._id, {
		lifecycle: { state: "Terminal", progress, outcome: "Unresolved" },
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
}

export async function settleFailed(
	ctx: MutationCtx,
	session: ResolutionLifecycleSource & { _id: Id<"resolutionSessions"> },
	message: string,
	failureCode: "CatalogMiss" | "Internal" = "Internal",
	diagnosticId: string = crypto.randomUUID(),
): Promise<string> {
	const progress = session.lifecycle.progress;
	await ctx.db.patch(session._id, {
		lifecycle: {
			state: "Terminal",
			progress,
			outcome: "PermanentFailure",
		},
		failureCode,
		diagnosticId,
		failureMessage: safeFailureMessage(message),
		updatedAt: Date.now(),
	});
	return diagnosticId;
}

function isResolutionProgress(value: unknown): value is ResolutionProgress {
	return (
		value === "Starting" ||
		value === "RouteAvailable" ||
		value === "GrammarAvailable" ||
		value === "ReadingAvailable" ||
		value === "Committing"
	);
}

function isActiveResolutionActivity(
	value: unknown,
): value is Exclude<ResolutionActivity, "Terminal"> {
	return (
		value === "Scheduled" ||
		value === "Running" ||
		value === "WaitingForRetry"
	);
}

function safeFailureMessage(message: string): string {
	return message.trim().length > 0 && message.length <= 240
		? message
		: "Resolution could not be completed.";
}
