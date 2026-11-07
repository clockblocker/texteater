import { spring } from "motion";
import type { Ease } from "./ease";

/** A spring a Move's progress runs on, mass 1. */
export type SpringCurve = {
	readonly kind: "spring";
	readonly stiffness: number;
	readonly damping: number;
	/**
	 * How fast the progress leaves 0, in shares of the way per second: 0
	 * from rest, and for a release the part of the hand's speed aimed at
	 * the rest. Given, never inferred.
	 */
	readonly rate: number;
};

/** A tween a Move's progress runs on: `ms` long on `ease`. */
type TweenCurve = {
	readonly kind: "tween";
	readonly ms: number;
	readonly ease: Ease;
};

/**
 * How a Move's one progress runs from 0 to 1. A curve says nothing about a
 * channel or a distance: every channel of the Move reads its share off this
 * one progress, so the box, its Parts, its stacking and the lean it lets go
 * of can never drift apart (#1311 rule 1).
 */
export type Curve = SpringCurve | TweenCurve;

/**
 * A progress is done once it stays this close to 1 and moves this slowly
 * (per second): a 900 px move ends within 0.09 px, so nothing snaps at its
 * end (#1311 rule 9).
 */
const PROGRESS_REST = { restDelta: 1e-4, restSpeed: 1e-3 } as const;

type Generator = ReturnType<typeof spring>;
const generators = new WeakMap<SpringCurve, Generator>();

function generatorOf(curve: SpringCurve): Generator {
	let generator = generators.get(curve);
	if (!generator) {
		generator = spring({
			keyframes: [0, 1],
			velocity: curve.rate,
			stiffness: curve.stiffness,
			damping: curve.damping,
			...PROGRESS_REST,
		});
		generators.set(curve, generator);
	}
	return generator;
}

/** The progress `curve` shows `t` ms into its run: 0 before, 1 once done. */
export function progressAfter(curve: Curve, t: number): number {
	if (t <= 0) return 0;
	if (curve.kind === "spring") {
		const state = generatorOf(curve).next(t);
		return state.done ? 1 : state.value;
	}
	if (t >= curve.ms) return 1;
	return curve.ease(t / curve.ms);
}

/** Whether `curve` has reached 1 for good `t` ms into its run. */
export function doneAfter(curve: Curve, t: number): boolean {
	if (t <= 0) return false;
	if (curve.kind === "spring") return generatorOf(curve).next(t).done;
	return t >= curve.ms;
}

/** How long `curve` runs, in ms. */
export function lengthOf(curve: Curve): number {
	if (curve.kind === "tween") return curve.ms;
	for (let t = 8; t < 8000; t += 8) if (doneAfter(curve, t)) return t;
	return 8000;
}
