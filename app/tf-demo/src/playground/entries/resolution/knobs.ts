import {
	type Latencies,
	type Outcome,
	PRESETS,
	type PresetKey,
} from "./session";

/**
 * What the inspector sets: which variant plays, the word and the fake
 * Session's latencies, Proposed's open questions, and the motion knobs.
 */

export type Variant = "today" | "proposed";

/** When a click's Deck is dealt (#1316). */
export type DealWhen = "threshold" | "click" | "selection";
/** Where a Card is dealt from: above the Pane, or the clicked word. */
export type DealFrom = "above" | "word";
/**
 * How a Card that joins late takes its place: the pile slides down a row
 * and uncovers it where it rests, or it is dealt in behind the pile while
 * the pile makes room.
 */
export type LateJoin = "uncovered" | "dealt";
/** When the Surface tail arrives: at commit, or with Grammar. */
export type SurfaceWhen = "commit" | "grammar";
/**
 * When the front Card turns face up: as its Knowledge lands, or at commit,
 * with the Cards that join then.
 */
export type TurnUp = "knowledge" | "commit";
/** How the front Card becomes its Note: the turn, then the growth, or both at once. */
export type Becoming = "turn-then-grow" | "together";
/** How a failed Session shows: on the Card's back, or turned face up. */
export type FailureLook = "back" | "face";

export type ReducedChoice = "off" | "system" | "on";

export type Feel = {
	readonly dealWhen: DealWhen;
	/** An answer inside this wait deals the Deck face up, with no turn. */
	readonly thresholdMs: number;
	readonly dealFrom: DealFrom;
	readonly lateJoin: LateJoin;
	readonly surfaceWhen: SurfaceWhen;
	readonly turnUp: TurnUp;
	readonly becoming: Becoming;
	readonly failure: FailureLook;
};

export const DEFAULT_FEEL: Feel = {
	dealWhen: "threshold",
	thresholdMs: 300,
	dealFrom: "above",
	lateJoin: "uncovered",
	surfaceWhen: "commit",
	turnUp: "knowledge",
	becoming: "together",
	failure: "back",
};

export type Knobs = {
	readonly story: string;
	readonly preset: PresetKey | "custom";
	readonly latencies: Latencies;
	readonly outcome: Outcome;
	readonly feel: Feel;
	readonly reducedMotion: ReducedChoice;
	readonly timeScale: number;
	readonly rtl: boolean;
};

export const DEFAULT_KNOBS: Knobs = {
	story: "bahnhof",
	preset: "typical",
	latencies: PRESETS.typical.latencies,
	outcome: PRESETS.typical.outcome,
	feel: DEFAULT_FEEL,
	reducedMotion: "system",
	timeScale: 1,
	rtl: false,
};

export const TIME_SCALES = [0.25, 0.5, 1] as const;
