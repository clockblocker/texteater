import type { Curve } from "./curve";
import { DECK_OF_CARDS_EASE, type Ease } from "./ease";
import { approachRate, landing } from "./hand";
import {
	type Channel,
	carries,
	type Move,
	NO_PARTS,
	sumAt,
	type Term,
	without,
} from "./move";
import { FOLLOW, type Shape, span } from "./shape";
import { SPRINGS, type SpringSpec, type TweenSpec } from "./springs";
import { crossing, type Neighbour } from "./stacking";
import type { Lean } from "./tilt";
import { sideAt, turnTarget } from "./turn";

/** A Body's value on each channel, physical: a rest, or what it shows. */
export type Pose = Partial<Record<Channel, number>>;

/** One leg of a scripted move: `ms` long from `at` ms, to `to`, an offset from the final rest. */
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
 * - `hand`: a release. A spring that starts with the part of the hand's
 *   speed aimed at the new rest, from where the Body shows, replacing what
 *   was in flight. With no way to go it has no speed and moves nothing.
 * - `app` with a spring: a reflow or a change of form. It cancels the jump
 *   in rest and adds to what is in flight, so position and speed stay
 *   continuous.
 * - `app` with a tween: a deal, a trick or another scripted move. It
 *   replaces what was in flight and runs from where the Body shows (or
 *   from `from`, unseen before) through `path`'s waypoints. Its stacking
 *   is cut at `zAt` and it starts turning at `sideAt`.
 */
export type MoveStyle =
	| {
			readonly source: "hand";
			readonly velocity: { readonly x: number; readonly y: number };
			readonly spring: SpringSpec;
	  }
	| { readonly source: "app"; readonly spring: SpringSpec }
	| {
			readonly source: "app";
			readonly tween: TweenSpec;
			readonly path?: Path;
			readonly from?: Pose;
			readonly zAt?: number;
			readonly sideAt?: number;
	  };

/** The channels a change of rest moves along one line. */
export const POSE: readonly Channel[] = [
	"x",
	"y",
	"width",
	"height",
	"rotate",
	"lift",
	"opacity",
];
const LEAN: readonly Channel[] = ["tiltX", "tiltY", "tiltLift", "glare"];
const FOLDED = new Set<Channel>([...POSE, ...LEAN]);

/**
 * How much of a Move's progress a lean takes to let go before a box that
 * changes size starts to: no Body leans while it resizes (#1322).
 */
export const LEAN_LEAD = 0.45;

function epsilon(channel: Channel): number {
	return channel === "lift" ||
		channel === "opacity" ||
		channel === "tiltLift" ||
		channel === "glare"
		? 1e-4
		: 0.01;
}

export type Change = {
	/** The Body's Moves before the change. */
	readonly live: readonly Move[];
	/** The rest it had, and the rest it has now. */
	readonly from: Pose;
	readonly to: Pose;
	readonly style: MoveStyle;
	readonly now: number;
	/** When the Move's clock starts: `UNSTARTED` until the Table starts it. */
	readonly bornAt: number;
	readonly turn: TweenSpec;
	/** The lean it shows, which the change lets go of. */
	readonly lean: Lean | null;
	/** Its stacking: drawn at `from`, resting at `to`, among `others`. */
	readonly stacking: {
		readonly from: number;
		readonly to: number;
		readonly others: readonly Neighbour[];
		readonly showing: ReadonlyMap<string, number>;
	} | null;
	/** Whether its form changes: its Parts are planned anew from where they show. */
	readonly formChanged: boolean;
};

/** What a change leaves a Body with. */
export type Planned = {
	readonly keep: readonly Move[];
	/** Its box, pose, lean, stacking and Parts; `null` when nothing moves. */
	readonly box: Move | null;
	readonly turn: Move | null;
};

function shownOf(change: Change, channel: Channel): number {
	return (
		(change.from[channel] ?? 0) + sumAt(change.live, channel, change.now)
	);
}

function terms(
	channels: readonly Channel[],
	delta: (channel: Channel) => number,
	shape: Shape,
): Term[] {
	return channels.flatMap((channel) => {
		const value = delta(channel);
		return Math.abs(value) < epsilon(channel)
			? []
			: [{ channel, delta: value, shape }];
	});
}

/** A scripted channel's waypoints on the Move's timeline, from `delay` for `total` ms. */
function pathTerm(
	channel: Channel,
	start: number,
	legs: readonly Leg[],
	ease: Ease,
	delay: number,
	total: number,
): Term | null {
	const keys = [start];
	const times = [0];
	const eases: Ease[] = [];
	let clock = delay;
	for (const leg of legs) {
		if (leg.at > clock) {
			keys.push(keys.at(-1) ?? 0);
			times.push(leg.at - delay);
			eases.push(DECK_OF_CARDS_EASE.linear);
		}
		clock = leg.at + leg.ms;
		keys.push(leg.to);
		times.push(clock - delay);
		eases.push(leg.ease ?? ease);
	}
	const scale = Math.max(...keys.map(Math.abs));
	if (scale < epsilon(channel)) return null;
	return {
		channel,
		delta: scale,
		shape: {
			kind: "keys",
			keys: keys.map((key) => key / scale),
			times: times.map((time) => time / total),
			eases,
		},
	};
}

type Box = {
	readonly curve: Curve;
	readonly delay: number;
	readonly terms: Term[];
	/** Where a Trick's stacking cut falls, as a share of its progress. */
	readonly cut?: number;
};

function scripted(
	change: Change,
	style: Extract<MoveStyle, { tween: unknown }>,
): Box | null {
	const path = style.path ?? {};
	const starts = (channel: Channel) =>
		style.from?.[channel] ??
		shownOf(change, channel) - (change.to[channel] ?? 0);
	const legs = POSE.flatMap((channel) => path[channel] ?? []);
	const delay = legs.length ? Math.min(...legs.map((leg) => leg.at)) : 0;
	const end = Math.max(
		legs.length ? 0 : style.tween.ms,
		...legs.map((leg) => leg.at + leg.ms),
		style.zAt ?? 0,
	);
	const total = end - delay;
	if (total <= 0) return null;
	const out: Term[] = [];
	for (const channel of POSE) {
		const own = path[channel];
		const start = starts(channel);
		const term = own?.length
			? pathTerm(channel, start, own, style.tween.ease, delay, total)
			: Math.abs(start) < epsilon(channel)
				? null
				: {
						channel,
						delta: start,
						shape: span(
							0,
							Math.min(1, style.tween.ms / total),
							style.tween.ease,
						),
					};
		if (term) out.push(term);
	}
	return {
		curve: { kind: "tween", ms: total, ease: DECK_OF_CARDS_EASE.linear },
		delay,
		terms: out,
		cut: Math.max(0, Math.min(1, ((style.zAt ?? delay) - delay) / total)),
	};
}

const BOX = new Set<Channel>(["x", "y", "width", "height"]);

function boxOf(change: Change, shape: Shape): Box | null {
	const { style, to } = change;
	const shown = (channel: Channel) =>
		shownOf(change, channel) - (to[channel] ?? 0);
	if (style.source === "hand") {
		/* a release with no way to go throws the hand's speed away */
		const way = [...BOX].some((channel) => Math.abs(shown(channel)) >= 0.5);
		const rate = way
			? approachRate(
					{ x: shownOf(change, "x"), y: shownOf(change, "y") },
					{ x: to.x ?? 0, y: to.y ?? 0 },
					style.velocity,
				)
			: 0;
		return {
			curve: { kind: "spring", ...landing(style.spring, rate), rate },
			delay: 0,
			terms: terms(POSE, shown, shape),
		};
	}
	if ("spring" in style) {
		const jump = (channel: Channel) =>
			(change.from[channel] ?? 0) - (to[channel] ?? 0);
		return {
			curve: { kind: "spring", ...style.spring, rate: 0 },
			delay: 0,
			terms: terms(POSE, jump, shape),
		};
	}
	if (style.path) return scripted(change, style);
	return {
		curve: { kind: "tween", ...style.tween },
		delay: 0,
		terms: terms(
			POSE,
			(channel) => style.from?.[channel] ?? shown(channel),
			shape,
		),
	};
}

/** How far the shown angle is from the new rest's, or `null` for no change of side. */
function turnDelta(change: Change): number | null {
	const style = change.style;
	const scriptedTurn = "tween" in style ? style.from?.turn : undefined;
	if (scriptedTurn !== undefined) return scriptedTurn;
	const from = change.from.turn ?? 0;
	const to = change.to.turn ?? 0;
	if ((((from - to) % 360) + 360) % 360 === 0) return null;
	const angle = shownOf(change, "turn");
	return angle - turnTarget(angle, from, sideAt(to));
}

/**
 * A change of side, as a Move of its own: one angle that always turns the
 * same way and turns back the way it came when reversed mid-turn
 * (`turnTarget`), from its `sideAt`. A turn with no length switches then.
 */
function turnMove(change: Change): Move | null | undefined {
	const delta = turnDelta(change);
	if (delta === null) return undefined;
	if (Math.abs(delta) < epsilon("turn")) return null;
	const style = change.style;
	return {
		curve: {
			kind: "tween",
			ms: Math.max(1, change.turn.ms),
			ease: change.turn.ease,
		},
		source: "app",
		bornAt: change.bornAt,
		delayMs: "tween" in style ? (style.sideAt ?? 0) : 0,
		terms: [{ channel: "turn", delta, shape: FOLLOW }],
		parts: NO_PARTS,
		crossing: null,
		leaving: null,
	};
}

/**
 * The Moves a change of rest leaves a Body with. Everything it moves rides
 * one Move: the box and pose from where they show, on the source's style;
 * the lean it shows, let go before a box that resizes starts to; and its
 * stacking, crossed on the same progress (or cut at a Trick's `zAt`). A
 * turn is a Move of its own. What it replaces is folded into its start;
 * what it adds to keeps running.
 */
export function plan(change: Change): Planned {
	const { style } = change;
	const resized =
		Math.abs(shownOf(change, "width") - (change.to.width ?? 0)) > 0.5 ||
		Math.abs(shownOf(change, "height") - (change.to.height ?? 0)) > 0.5;
	const replaces = style.source === "hand" || "tween" in style;
	const lead = resized && change.lean ? LEAN_LEAD : 0;
	/* after a lean's lead the box sets off from still, never at the speed
	   the progress has reached by then */
	const shape = lead ? span(lead, 1, DECK_OF_CARDS_EASE.quadIn) : FOLLOW;
	const box = boxOf(change, shape);
	const lean = change.lean;
	const leanTerms = lean
		? terms(
				LEAN,
				(channel) => lean[channel as keyof Lean],
				lead ? span(0, lead) : FOLLOW,
			)
		: [];
	const stacking = change.stacking
		? crossing({
				...change.stacking,
				shape:
					box?.cut === undefined
						? shape
						: { kind: "step", at: box.cut },
			})
		: null;
	const turned = turnMove(change);
	const keep = change.live
		.map((move) => {
			if (isTurn(move)) return turned === undefined ? move : null;
			return without(move, replaces ? FOLDED : LEAN_ONLY, {
				crossing: change.stacking === null,
				parts: !change.formChanged,
			});
		})
		.filter((move): move is Move => !!move && carries(move));
	const all = [...(box?.terms ?? []), ...leanTerms];
	const boxMove: Move | null =
		all.length || stacking || change.formChanged
			? {
					curve: box?.curve ?? {
						kind: "spring",
						...SPRINGS.reflow,
						rate: 0,
					},
					source: style.source,
					bornAt: change.bornAt,
					delayMs: box?.delay ?? 0,
					terms: all,
					parts: NO_PARTS,
					crossing: stacking,
					leaving: null,
				}
			: null;
	return { keep, box: boxMove, turn: turned ?? null };
}

const LEAN_ONLY = new Set<Channel>(LEAN);

/** Whether `move` only turns its Body over. */
export function isTurn(move: Move): boolean {
	return (
		move.terms.length > 0 &&
		move.terms.every((term) => term.channel === "turn") &&
		move.parts.size === 0 &&
		!move.crossing
	);
}
