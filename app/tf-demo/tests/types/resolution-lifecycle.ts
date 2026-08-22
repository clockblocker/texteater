import type { ResolutionLifecycle } from "../../convex/model/resolutionSessions";

const active: ResolutionLifecycle = {
	state: "Active",
	progress: "GrammarAvailable",
	activity: "WaitingForRetry",
};
void active;

const complete: ResolutionLifecycle = {
	state: "Terminal",
	progress: "Committing",
	outcome: "Complete",
};
void complete;

const unresolved: ResolutionLifecycle = {
	state: "Terminal",
	progress: "GrammarAvailable",
	outcome: "Unresolved",
};
void unresolved;

const failed: ResolutionLifecycle = {
	state: "Terminal",
	progress: "ReadingAvailable",
	outcome: "PermanentFailure",
};
void failed;

const activeWithOutcome: ResolutionLifecycle = {
	state: "Active",
	progress: "Starting",
	activity: "Scheduled",
	// @ts-expect-error Active lifecycles cannot have an outcome.
	outcome: "Unresolved",
};
void activeWithOutcome;

const terminalWithActivity: ResolutionLifecycle = {
	state: "Terminal",
	progress: "GrammarAvailable",
	// @ts-expect-error Terminal lifecycles cannot have an activity.
	activity: "Running",
	outcome: "Unresolved",
};
void terminalWithActivity;

const earlyComplete: ResolutionLifecycle = {
	state: "Terminal",
	progress: "GrammarAvailable",
	// @ts-expect-error Complete is only legal at Committing progress.
	outcome: "Complete",
};
void earlyComplete;
