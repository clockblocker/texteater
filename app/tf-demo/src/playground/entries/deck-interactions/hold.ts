/**
 * D's hold to lift, pure. A press that stays within `slop` px of where it
 * came down for `ms` lifts its Card into the hand; one that moves further
 * first is no hold, and a swipe takes it as before. While the hold builds,
 * the Card shows it: after `delayMs`, so a tap or an immediate swipe never
 * shows a hint of it, it rises or sinks with the hold's share, and at the
 * lift it pops up to its lifted pose. The hold runs in real time, as the
 * double-tap's window does: slow-mo slows the motion, not the hand.
 */

export const HOLD_BUILDS = ["rise", "sink", "none"] as const;
export type HoldBuild = (typeof HOLD_BUILDS)[number];

/** How much of the way to the lifted pose a rising Card goes while the hold builds: the rest is the lift's own pop. */
export const RISE_SHARE = 0.5;
/** How far a sinking Card presses in while the hold builds, as a share of its scale: iOS's press on a context menu's preview. */
export const SINK_DEPTH = 0.03;

export type HoldState = "holding" | "moved" | "lifts";

/**
 * Where a press stands `elapsed` ms after it came down, the hand `travel`
 * px from where it did: moved past the slop, it is no hold; held still
 * for `ms`, it lifts; otherwise it is still holding.
 */
export function holdStateOf({
	elapsed,
	travel,
	ms,
	slop,
}: {
	readonly elapsed: number;
	readonly travel: number;
	readonly ms: number;
	readonly slop: number;
}): HoldState {
	if (travel > slop) return "moved";
	if (elapsed >= ms) return "lifts";
	return "holding";
}

/**
 * How far the hold has built `elapsed` ms after the press, 0 to 1: 0 until
 * `delayMs`, then evenly to 1 at `ms`, the lift.
 */
export function buildShareOf(
	elapsed: number,
	ms: number,
	delayMs: number,
): number {
	const span = ms - delayMs;
	if (span <= 0) return elapsed >= ms ? 1 : 0;
	return Math.min(1, Math.max(0, (elapsed - delayMs) / span));
}

/** A Card's lift (its shadow, 0 to 1) and its scale. */
export type Pose = { readonly lift: number; readonly s: number };

export type PoseRules = {
	/** The Card's scale in its slot. */
	readonly rest: number;
	/** Its scale in the hand. */
	readonly lifted: number;
	/** The lift a press gives it. */
	readonly pressLift: number;
	readonly reduce: boolean;
};

/** The Card in the hand: fully lifted, and grown unless motion is reduced, where nothing grows. */
export function liftedPose(rules: PoseRules): Pose {
	return { lift: 1, s: rules.reduce ? rules.rest : rules.lifted };
}

/**
 * The Card while the hold builds, at `share` of it. Rising, its shadow
 * and its scale go `RISE_SHARE` of the way from the press to the lifted
 * pose; sinking, its shadow stays the press's and it presses in by
 * `SINK_DEPTH`. Reduced, it never changes size: rising lifts only its
 * shadow, and sinking shows nothing.
 */
export function buildPoseOf(
	share: number,
	build: HoldBuild,
	rules: PoseRules,
): Pose {
	const press = { lift: rules.pressLift, s: rules.rest };
	if (build === "none") return press;
	if (build === "sink")
		return rules.reduce
			? press
			: { lift: press.lift, s: rules.rest * (1 - SINK_DEPTH * share) };
	const to = liftedPose(rules);
	const k = RISE_SHARE * share;
	return {
		lift: press.lift + (to.lift - press.lift) * k,
		s: press.s + (to.s - press.s) * k,
	};
}
