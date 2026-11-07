import type { MotionValue } from "motion/react";
import {
	cue,
	type MotionContext,
	type Phase,
	phases,
	REDUCED_TWEEN,
} from "../deck-interactions/motion-kit";
import type { CardValues } from "../deck-interactions/use-deck";
import type { Side } from "./playing-cards";
import type { CardPlan, Channel, Trick } from "./tricks";

/** The Card value each plan channel drives: x and y are the Card's u and v. */
const VALUE_OF = { x: "u", y: "v", rot: "r", o: "o" } as const satisfies Record<
	Channel,
	keyof CardValues
>;
const CHANNELS = Object.keys(VALUE_OF) as Channel[];

/** When a trick's last move lands; it is done then, and later cues play on. */
export function trickEnd(trick: Trick): number {
	let end = 0;
	for (const plan of trick.plans)
		for (const legs of Object.values(plan.moves ?? {}))
			for (const leg of legs ?? []) end = Math.max(end, leg.at + leg.ms);
	return end;
}

/**
 * A Card's clock under reduced motion: its moves, from the first leg's
 * start to the last's end, take the short tween's length, and what comes
 * before or after keeps its distance from them. Elsewhere time runs as is.
 */
export function reducedClock(plan: CardPlan): (t: number) => number {
	const legs: Phase[] = Object.values(plan.moves ?? {}).flatMap(
		(list) => list ?? [],
	);
	if (legs.length === 0) return (t) => t;
	const start = Math.min(...legs.map((leg) => leg.at));
	const end = Math.max(...legs.map((leg) => leg.at + leg.ms));
	const span = end - start;
	const short = REDUCED_TWEEN.ms;
	return (t) => {
		if (t <= start) return t;
		if (t >= end) return t - span + short;
		return start + ((t - start) / span) * short;
	};
}

export type Stage = {
	readonly valuesOf: (id: string) => CardValues;
	readonly sideOf: (id: string) => MotionValue<Side>;
};

/**
 * Plays `trick` on the Cards' values. `done` settles when its last move
 * lands and every cue up to then has fired; `stop` halts all of it.
 */
export function playTrick(
	trick: Trick,
	stage: Stage,
	context: MotionContext,
): { readonly done: Promise<unknown>; readonly stop: () => void } {
	const end = trickEnd(trick);
	const waits: PromiseLike<unknown>[] = [];
	const stops: (() => void)[] = [];
	const schedule = (
		at: number,
		clock: (t: number) => number,
		fn: () => void,
	) => {
		if (at > end) {
			stops.push(cue(clock(at), fn, context));
			return;
		}
		waits.push(
			new Promise<void>((resolve) => {
				stops.push(
					cue(
						clock(at),
						() => {
							fn();
							resolve();
						},
						context,
					),
				);
			}),
		);
	};
	for (const plan of trick.plans) {
		const card = stage.valuesOf(plan.id);
		const side = stage.sideOf(plan.id);
		const clock = context.reduce ? reducedClock(plan) : (t: number) => t;
		for (const channel of CHANNELS) {
			const from = plan.from?.[channel];
			if (from !== undefined) card[VALUE_OF[channel]].jump(from);
		}
		for (const channel of CHANNELS) {
			const legs = plan.moves?.[channel];
			if (!legs?.length) continue;
			const controls = phases(card[VALUE_OF[channel]], legs, context);
			waits.push(controls.finished);
			stops.push(() => controls.stop());
		}
		for (const { at, to } of plan.z ?? [])
			schedule(at, clock, () => card.z.set(to));
		for (const { at, to } of plan.side ?? [])
			schedule(at, clock, () => side.set(to));
	}
	return {
		done: Promise.all(waits),
		stop: () => {
			for (const stop of stops) stop();
		},
	};
}
