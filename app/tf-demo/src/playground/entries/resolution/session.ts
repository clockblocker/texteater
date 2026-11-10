/**
 * A fake Resolution Session, pure: the stages a click's Session goes
 * through and when each is reached, from a latency per stage. It makes no
 * call and knows no word; `story-notes.ts` turns a state into the
 * Resolution Note the real Session would project for it.
 */

/** The stages a click waits for, in order; each latency runs from the one before. */
export const STAGES = [
	"selection",
	"firstResult",
	"grammar",
	"knowledge",
	"commit",
] as const;
export type Stage = (typeof STAGES)[number];

/** How long each stage takes after the one before it, in ms. */
export type Latencies = Readonly<Record<Stage, number>>;

/**
 * How the Session ends: it commits, it fails for good where its Knowledge
 * would land, or the click finds a stored route and no Session runs.
 */
export type Outcome = "Complete" | "Failure" | "Stored";

/**
 * What a click knows, in the order it learns it.
 *
 * - `Clicked`: the word is lit and the selection is on its way.
 * - `Selected`: the selection returned; a Session runs under its request.
 * - `Started`: the Session's first result: the clicked sentence.
 * - `Grammar`: Grammar read the clicked words.
 * - `Knowledge`: Luna's emoji and base form landed.
 * - `Committed`: the occurrence is stored; the stored Notes take over.
 * - `Stored`: the selection found a stored route; the stored Notes at once.
 * - `Failed`: the Session ended for good without an occurrence.
 */
export type SessionPhase =
	| "Clicked"
	| "Selected"
	| "Started"
	| "Grammar"
	| "Knowledge"
	| "Committed"
	| "Stored"
	| "Failed";

export type SessionState = {
	/** Ms after the click. */
	readonly at: number;
	readonly phase: SessionPhase;
};

export type SessionPlan = {
	readonly latencies: Latencies;
	readonly outcome: Outcome;
};

const AFTER: Readonly<Record<Stage, SessionPhase>> = {
	selection: "Selected",
	firstResult: "Started",
	grammar: "Grammar",
	knowledge: "Knowledge",
	commit: "Committed",
};

/**
 * The states a click passes through, the click first, each at the time its
 * stage's latency adds to the one before. A stored route answers with the
 * selection and nothing follows; a failure ends where the Knowledge would
 * have landed.
 */
export function sessionTimeline({
	latencies,
	outcome,
}: SessionPlan): readonly SessionState[] {
	const states: SessionState[] = [{ at: 0, phase: "Clicked" }];
	let at = 0;
	for (const stage of STAGES) {
		at += Math.max(0, latencies[stage]);
		if (outcome === "Stored") {
			states.push({ at, phase: "Stored" });
			break;
		}
		if (outcome === "Failure" && stage === "knowledge") {
			states.push({ at, phase: "Failed" });
			break;
		}
		states.push({ at, phase: AFTER[stage] });
	}
	return states;
}

/** The state a click is in `ms` after it: the last one reached. */
export function stateAt(
	timeline: readonly SessionState[],
	ms: number,
): SessionState {
	let reached = timeline[0] ?? { at: 0, phase: "Clicked" as const };
	for (const state of timeline) if (state.at <= ms) reached = state;
	return reached;
}

/** When the timeline reaches `phase`, or `null` when it never does. */
export function reachedAt(
	timeline: readonly SessionState[],
	phase: SessionPhase,
): number | null {
	return timeline.find((state) => state.phase === phase)?.at ?? null;
}

/** When the timeline ends: at its commit, its stored answer or its failure. */
export function endsAt(timeline: readonly SessionState[]): number {
	return timeline.at(-1)?.at ?? 0;
}

const ORDER: readonly SessionPhase[] = [
	"Clicked",
	"Selected",
	"Started",
	"Grammar",
	"Knowledge",
	"Committed",
];

/** Whether `phase` is at or past `mark` on a Session that runs to its commit. */
export function past(phase: SessionPhase, mark: SessionPhase): boolean {
	if (phase === "Stored") return true;
	if (phase === "Failed")
		return ORDER.indexOf(mark) <= ORDER.indexOf("Grammar");
	return ORDER.indexOf(phase) >= ORDER.indexOf(mark);
}

export type PresetKey = "typical" | "fast" | "slow" | "stored" | "failure";

/**
 * A typical click commits around 1.5 s, most of it the wait for its
 * Knowledge; a fast one is done inside the face-up threshold; a slow one
 * takes over four seconds; a stored route answers with the selection; a
 * failure ends where the Knowledge would have landed.
 */
export const PRESETS: Readonly<
	Record<PresetKey, SessionPlan & { readonly label: string }>
> = {
	typical: {
		label: "Typical",
		outcome: "Complete",
		latencies: {
			selection: 120,
			firstResult: 60,
			grammar: 420,
			knowledge: 800,
			commit: 100,
		},
	},
	fast: {
		label: "Fast",
		outcome: "Complete",
		latencies: {
			selection: 40,
			firstResult: 20,
			grammar: 80,
			knowledge: 80,
			commit: 30,
		},
	},
	slow: {
		label: "Slow",
		outcome: "Complete",
		latencies: {
			selection: 300,
			firstResult: 150,
			grammar: 1200,
			knowledge: 2400,
			commit: 350,
		},
	},
	stored: {
		label: "Stored",
		outcome: "Stored",
		latencies: {
			selection: 60,
			firstResult: 0,
			grammar: 0,
			knowledge: 0,
			commit: 0,
		},
	},
	failure: {
		label: "Failure",
		outcome: "Failure",
		latencies: {
			selection: 120,
			firstResult: 60,
			grammar: 420,
			knowledge: 900,
			commit: 0,
		},
	},
};
