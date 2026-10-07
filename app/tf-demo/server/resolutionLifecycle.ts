import type { Infer } from "convex/values";
import type {
	resolutionActivityValidator,
	resolutionFailureCodeValidator,
	resolutionGrammarProjectionValidator,
	resolutionLifecycleValidator,
	resolutionPhaseValidator,
	resolutionProgressValidator,
	resolutionReadingProjectionValidator,
	resolutionSessionGuardValidator,
} from "../convex/model/validators";

/**
 * The Resolution Session's ctx-free rules: its lifecycle shape, the order its
 * progress moves in, and its timing limits. The session module in `convex/model/resolutionSessions.ts` applies
 * them to rows.
 */

/**
 * A run that has written nothing for this long is declared stale. It exceeds
 * Convex's 10-minute action limit, so a live run is never duplicated.
 */
export const STALE_RUN_AFTER_MS = 11 * 60 * 1_000;
/**
 * A crashed run is recovered until this long after its session started or a
 * learner retried it. The session stores it as `retryDeadlineAt`.
 */
export const RECOVERY_DEADLINE_MS = 15 * 60 * 1_000;
/**
 * The first run is declared stale after `STALE_RUN_AFTER_MS` (11 minutes) and
 * its replacement after twice that (22 minutes), past `RECOVERY_DEADLINE_MS`
 * (15 minutes). So only 2 runs fit.
 */
export const MAX_RESOLUTION_RUNS = 2;
/** Sessions and their runs are kept this long after their last write. */
export const RESOLUTION_RETENTION_MS = 24 * 60 * 60 * 1_000;

export type ResolutionProgress = Infer<typeof resolutionProgressValidator>;
type ResolutionActivity = Infer<typeof resolutionActivityValidator>;
export type ResolutionLifecycle = Infer<typeof resolutionLifecycleValidator>;
export type ResolutionSessionGuard = Infer<
	typeof resolutionSessionGuardValidator
>;
/** A Grammar projection as the Session row stores it. */
export type StoredResolutionGrammar = Infer<
	typeof resolutionGrammarProjectionValidator
>;
/** A Reading projection as the Session row stores it. */
export type StoredResolutionReading = Infer<
	typeof resolutionReadingProjectionValidator
>;
export type ResolutionPhase = Infer<typeof resolutionPhaseValidator>;
export type ResolutionFailureCode = Infer<
	typeof resolutionFailureCodeValidator
>;

const progressPosition: Readonly<Record<ResolutionProgress, number>> = {
	Starting: 0,
	RouteAvailable: 1,
	GrammarAvailable: 2,
	ReadingAvailable: 3,
	Committing: 4,
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

/**
 * Whether a run's guard still names `session`'s current run, and its Segment
 * when the guard carries one.
 */
export function guardMatches(
	session: { readonly runToken: string; readonly segmentId: string },
	guard: { readonly runToken: string; readonly segmentId?: string },
): boolean {
	return (
		session.runToken === guard.runToken &&
		(guard.segmentId === undefined || session.segmentId === guard.segmentId)
	);
}

export function phaseForProgress(
	progress: ResolutionProgress,
): ResolutionPhase {
	return progress === "Starting"
		? "Route"
		: progress === "RouteAvailable"
			? "Grammar"
			: progress === "GrammarAvailable"
				? "Reading"
				: "Commit";
}

export function assertOperationalString(value: string, name: string): void {
	if (value.length === 0 || value.length > 200) {
		throw new Error(`${name} must contain 1 to 200 characters.`);
	}
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
	return value === "Scheduled" || value === "Running";
}
