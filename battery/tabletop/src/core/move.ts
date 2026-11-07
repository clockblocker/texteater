import type { Ease } from "./ease";
import type { Point } from "./geometry";
import type { SpringSpec, TweenSpec } from "./springs";
import type { Channel } from "./term";

/** A Body's value on each channel, physical: a rest, or what it shows. */
export type Pose = Partial<Record<Channel, number>>;

/**
 * One leg of a scripted move: `ms` long from `at` ms after the move starts,
 * to `to`, an offset from the final rest in the channel's physical units.
 */
export type Leg = {
	readonly at: number;
	readonly ms: number;
	readonly to: number;
	readonly ease?: Ease;
};

/** The legs each channel moves through, in order and never overlapping. */
export type Path = Partial<Record<Channel, readonly Leg[]>>;

/**
 * How a Body's next change of rest moves, decided by its source (#1309 Q2).
 *
 * - `hand`: a release, throw or put-back. A spring that starts with the part
 *   of the hand's velocity (px/s) aimed at the new rest, and replaces every
 *   Term the Body had.
 * - `app` with a spring: a reflow or a change of form. It adds a Term that
 *   cancels the jump in rest, and the Terms already running keep running.
 * - `app` with a tween: a trick, a deal or a scripted move. It replaces the
 *   Body's Terms and starts from where the Body shows (or from `from`),
 *   through `path`'s waypoints. Its stacking order changes at `zAt` and it
 *   starts turning at `sideAt`.
 */
export type Move =
	| {
			readonly source: "hand";
			readonly velocity: Point;
			readonly spring: SpringSpec;
	  }
	| { readonly source: "app"; readonly spring: SpringSpec }
	| {
			readonly source: "app";
			readonly tween: TweenSpec;
			readonly delayMs?: number;
			readonly path?: Path;
			/** Offsets from the final rest the Body starts at, unseen before. */
			readonly from?: Pose;
			readonly zAt?: number;
			readonly sideAt?: number;
	  };
