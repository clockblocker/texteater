import { DECK_OF_CARDS_EASE, type Ease } from "./ease";
import { approachRate } from "./geometry";
import type { Leg, Move, Pose } from "./move";
import type { TweenSpec } from "./springs";
import { type Channel, done, sumAt, type Term } from "./term";
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
 * `glide` (the playground's `use-deck.ts`) in offset space: every channel
 * starts from where it shows on one spring, with the part of the hand's
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
	return MOVED.flatMap((channel) => {
		const delta = shown(channel);
		if (Math.abs(delta) < epsilon(channel)) return [];
		return [
			term(input, channel, delta, {
				curve: {
					kind: "spring",
					...move.spring,
					velocity: -delta * rate,
				},
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
	return MOVED.flatMap((channel) => {
		const delta = (input.from[channel] ?? 0) - (input.to[channel] ?? 0);
		if (Math.abs(delta) < epsilon(channel)) return [];
		return [
			term(input, channel, delta, {
				curve: { kind: "spring", ...move.spring, velocity: 0 },
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
				curve: {
					kind: "tween",
					ms: move.tween.ms,
					ease: move.tween.ease,
				},
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

/**
 * A change of side: one angle that always turns the same way, and turns
 * back the way it came when reversed mid-turn (`turnTarget`). The rest is
 * the new side's angle, 0 or 180; the Term carries the rest of the way.
 */
function turnTerms(input: RetargetInput): Term[] | null {
	const from = input.from.turn ?? 0;
	const to = input.to.turn ?? 0;
	if ((((from - to) % 360) + 360) % 360 === 0) return null;
	const angle = shownOf(input, "turn");
	const target = turnTarget(angle, from, sideAt(to));
	const delta = angle - target;
	if (Math.abs(delta) < epsilon("turn") || input.turn.ms <= 0) return [];
	const sideCue = "tween" in input.move ? (input.move.sideAt ?? 0) : 0;
	return [
		term(input, "turn", delta, {
			curve: { kind: "tween", ms: input.turn.ms, ease: input.turn.ease },
			delayMs: sideCue,
			source: "app",
		}),
	];
}

/**
 * The Terms a change of rest leaves a Body with: shown position and velocity
 * stay continuous across it, and the move's source decides its style.
 */
export function retarget(input: RetargetInput): Retargeted {
	const { move } = input;
	const added: Term[] =
		move.source === "hand"
			? handTerms(input, move)
			: "spring" in move
				? additiveTerms(input, move)
				: tweenTerms(input, move);
	const replacesMoved = move.source === "hand" || "tween" in move;
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
