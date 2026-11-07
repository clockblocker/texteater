import { DECK_OF_CARDS_EASE, type Ease } from "./ease";
import { approachRate } from "./geometry";
import type { Leg, Move, Pose } from "./move";
import type { SpringSpec, TweenSpec } from "./springs";
import { type Channel, type Curve, done, sumAt, type Term } from "./term";
import { sideAt, turnTarget } from "./turn";

/** The channels a change of rest moves along one line. */
const MOVED = [
	"x",
	"y",
	"width",
	"height",
	"rotate",
	"lift",
	"opacity",
] as const satisfies readonly Channel[];

function epsilon(channel: Channel): number {
	return channel === "lift" || channel === "opacity" ? 1e-4 : 0.01;
}

export type RetargetInput = {
	/** The Body's Terms before the change. */
	readonly live: readonly Term[];
	/** The rest it had, and the rest it has now. */
	readonly from: Pose;
	readonly to: Pose;
	readonly move: Move;
	readonly now: number;
	/** How a change of side turns. */
	readonly turn: TweenSpec;
};

/** The Terms a change of rest keeps, and the ones it adds. */
export type Retargeted = {
	readonly kept: readonly Term[];
	readonly added: readonly Term[];
};

function shownOf(input: RetargetInput, channel: Channel): number {
	return (input.from[channel] ?? 0) + sumAt(input.live, channel, input.now);
}

function term(
	input: RetargetInput,
	channel: Channel,
	delta: number,
	rest: Omit<Term, "channel" | "delta" | "bornAt">,
): Term {
	return { channel, delta, bornAt: input.now, ...rest };
}

/**
 * The spring a release lands on: `spring` itself while the hand comes in
 * no faster than the spring's own rate, √stiffness, which it takes without
 * passing the rest. A faster hand lands on a critically damped spring of
 * its own rate, which runs its share down as e^(−rate·t): the Body keeps
 * the hand's speed and still never passes its rest (#1311 rule 5).
 */
export function landing(spring: SpringSpec, rate: number): SpringSpec {
	if (rate <= Math.sqrt(spring.stiffness)) return spring;
	const stiffness = rate * rate;
	return { stiffness, damping: 2 * Math.sqrt(stiffness) };
}

/**
 * `glide` (the playground's `use-deck.ts`) in offset space: every channel
 * starts from where it shows on one curve, with the part of the hand's
 * speed aimed at the rest, so the channels arrive together on one line.
 */
function handTerms(
	input: RetargetInput,
	move: Extract<Move, { source: "hand" }>,
): Term[] {
	const shown = (channel: Channel) =>
		shownOf(input, channel) - (input.to[channel] ?? 0);
	const rate = approachRate(
		{ x: shownOf(input, "x"), y: shownOf(input, "y") },
		{ x: input.to.x ?? 0, y: input.to.y ?? 0 },
		move.velocity,
	);
	const curve: Curve = {
		kind: "spring",
		...landing(move.spring, rate),
		rate,
	};
	return MOVED.flatMap((channel) => {
		const delta = shown(channel);
		if (Math.abs(delta) < epsilon(channel)) return [];
		return [
			term(input, channel, delta, {
				curve,
				delayMs: 0,
				source: "hand",
				raise: true,
			}),
		];
	});
}

/** A Term for each channel whose rest jumped, cancelling the jump. */
function additiveTerms(
	input: RetargetInput,
	move: Extract<Move, { spring: unknown }>,
): Term[] {
	const curve: Curve = { kind: "spring", ...move.spring, rate: 0 };
	return MOVED.flatMap((channel) => {
		const delta = (input.from[channel] ?? 0) - (input.to[channel] ?? 0);
		if (Math.abs(delta) < epsilon(channel)) return [];
		return [
			term(input, channel, delta, {
				curve,
				delayMs: 0,
				source: "app",
				raise: true,
			}),
		];
	});
}

/**
 * A keyframed tween through `legs` from `start`, as the playground's
 * `phases()` builds one: a gap between legs holds still, and the first
 * leg's start is the delay.
 */
export function pathTerm(
	channel: Channel,
	start: number,
	legs: readonly Leg[],
	ease: Ease,
	now: number,
): Term | null {
	const first = legs[0];
	if (!first) return null;
	const keys = [start];
	const times = [0];
	const eases: Ease[] = [];
	let clock = first.at;
	for (const leg of legs) {
		if (leg.at > clock) {
			keys.push(keys.at(-1) ?? 0);
			times.push(leg.at - first.at);
			eases.push(DECK_OF_CARDS_EASE.linear);
		}
		clock = leg.at + leg.ms;
		keys.push(leg.to);
		times.push(clock - first.at);
		eases.push(leg.ease ?? ease);
	}
	const total = clock - first.at;
	const scale = Math.max(...keys.map(Math.abs));
	if (total <= 0 || scale < epsilon(channel)) return null;
	return {
		channel,
		delta: scale,
		curve: {
			kind: "tween",
			ms: total,
			ease: eases,
			keyframes: keys.map((key) => key / scale),
			times: times.map((time) => time / total),
		},
		delayMs: first.at,
		bornAt: now,
		source: "app",
	};
}

function tweenTerms(
	input: RetargetInput,
	move: Extract<Move, { tween: unknown }>,
): Term[] {
	const curve: Curve = {
		kind: "tween",
		ms: move.tween.ms,
		ease: move.tween.ease,
	};
	return MOVED.flatMap((channel) => {
		const start =
			move.from?.[channel] ??
			shownOf(input, channel) - (input.to[channel] ?? 0);
		const legs = move.path?.[channel];
		if (legs?.length) {
			const scripted = pathTerm(
				channel,
				start,
				legs,
				move.tween.ease,
				input.now,
			);
			return scripted ? [scripted] : [];
		}
		if (Math.abs(start) < epsilon(channel)) return [];
		return [
			term(input, channel, start, {
				curve,
				delayMs: move.delayMs ?? 0,
				source: "app",
			}),
		];
	});
}

/** The stacking order: it changes at once, or holds until the move's `zAt`. */
function zTerms(input: RetargetInput): Term[] {
	const delta = Math.round(shownOf(input, "z") - (input.to.z ?? 0));
	const zAt = "tween" in input.move ? (input.move.zAt ?? 0) : 0;
	if (zAt <= 0 || delta === 0) return [];
	return [
		term(input, "z", delta, {
			curve: {
				kind: "tween",
				ms: zAt,
				ease: DECK_OF_CARDS_EASE.linear,
				keyframes: [1, 1],
			},
			delayMs: 0,
			source: "app",
		}),
	];
}

/** How far the shown angle is from the new rest's, or `null` for no change of side. */
function turnDelta(input: RetargetInput): number | null {
	const scripted = "tween" in input.move ? input.move.from?.turn : undefined;
	if (scripted !== undefined) return scripted;
	const from = input.from.turn ?? 0;
	const to = input.to.turn ?? 0;
	if ((((from - to) % 360) + 360) % 360 === 0) return null;
	const angle = shownOf(input, "turn");
	return angle - turnTarget(angle, from, sideAt(to));
}

/**
 * A change of side: one angle that always turns the same way, and turns
 * back the way it came when reversed mid-turn (`turnTarget`). The rest is
 * the new side's angle, 0 or 180; the Term carries the rest of the way. A
 * scripted move may start it off its rest instead (`from.turn`). It turns
 * at the move's `sideAt`; a turn with no length switches then, or at once.
 */
function turnTerms(input: RetargetInput): Term[] | null {
	const delta = turnDelta(input);
	if (delta === null) return null;
	const sideCue = "tween" in input.move ? (input.move.sideAt ?? 0) : 0;
	const ms = Math.max(0, input.turn.ms);
	if (Math.abs(delta) < epsilon("turn") || (ms === 0 && sideCue <= 0))
		return [];
	return [
		term(input, "turn", delta, {
			curve: { kind: "tween", ms, ease: input.turn.ease },
			delayMs: sideCue,
			source: "app",
		}),
	];
}

/**
 * Whether `move` replaces the Terms its channels had (the hand, a tween),
 * or adds to them while they decay (an app spring).
 */
export function replaces(move: Move): boolean {
	return move.source === "hand" || "tween" in move;
}

/**
 * The Terms a change of rest leaves a Body with: shown position and velocity
 * stay continuous across it, and the move's source decides its style. The
 * channels it moves along one line share one curve, so its box rides one
 * progress; a scripted path keeps a curve per channel.
 */
export function retarget(input: RetargetInput): Retargeted {
	const { move } = input;
	const replacesMoved = replaces(move);
	const added: Term[] =
		move.source === "hand"
			? handTerms(input, move)
			: "spring" in move
				? additiveTerms(input, move)
				: tweenTerms(input, move);
	const turned = turnTerms(input);
	const z = zTerms(input);
	added.push(...z, ...(turned ?? []));
	const kept = input.live.filter((live) => {
		if (done(live, input.now)) return false;
		if (live.channel === "z") return false;
		if (live.channel === "turn") return turned === null;
		return !(
			replacesMoved &&
			(MOVED as readonly Channel[]).includes(live.channel)
		);
	});
	return { kept, added };
}
