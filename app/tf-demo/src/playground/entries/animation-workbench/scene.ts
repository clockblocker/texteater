import type { ComponentType } from "react";

import type { Params } from "./motion";
import { clamp01, segmentAt } from "./motion";

/**
 * A scene is one animation that ships somewhere in tf-demo, rewritten as a
 * pure function of time. `frame(t, params)` is the whole choreography; the
 * scene's `Render` draws that frame with inline styles and no CSS
 * transitions, so a scrubbed instant is exactly what playback shows.
 *
 * Scenes are grouped by what moves, and a group is a section of the
 * workbench's index. The deck tap lives in `swap.ts` and keeps its own
 * tap-driven Move and its own spec; every other scene is replayed from
 * `t = 0`. Only animations that are in use belong here; `where` says
 * whether that is the main app or the playground prototypes.
 */

export type Knob = keyof Params;

/** Where the animation is in use: the product, or the deck prototypes. */
export type Where = "main app" | "playground";

export type Scene<F> = {
	readonly key: string;
	readonly title: string;
	/** Where this motion ships, so a change here can be carried back. */
	readonly source: string;
	readonly where: Where;
	/** The knobs this scene reads. The rest leave its frame untouched. */
	readonly knobs: readonly Knob[];
	/** The timeline, in ms. */
	readonly length: (params: Params) => number;
	/**
	 * A caveat about the preview at these params, or null: for instance
	 * that a spring was cut short before it settled.
	 */
	readonly caveat?: (params: Params) => string | null;
	readonly frame: (t: number, params: Params) => F;
	readonly Render: ComponentType<{ readonly frame: F }>;
};

export type AnyScene = Scene<unknown>;

/** Erase a scene's frame type so scenes of different shapes share a list. */
export function scene<F>(spec: Scene<F>): AnyScene {
	return spec as unknown as AnyScene;
}

export type SceneGroup = {
	readonly key: string;
	readonly title: string;
	readonly scenes: readonly AnyScene[];
};

export function groupLength(group: SceneGroup, params: Params): number {
	return Math.max(0, ...group.scenes.map((s) => s.length(params)));
}

/* -------------------------------------------------------------- helpers */

/**
 * The eased progress of one segment that starts at `from` ms and runs
 * `duration` ms: 0 before it, 1 after it. Prefer `progressOf(spec, t)`
 * when the segment is one of the shared specs; this is for the stand-in
 * timings a preview needs that nothing ships.
 */
export { segmentAt as segment };

/** `value` when `p` is 0, `target` when 1. */
export function mix(value: number, target: number, p: number): number {
	return value + (target - value) * p;
}

/** A `color-mix()` from `from` to `to`, evaluated by the browser. */
export function colorMix(from: string, to: string, p: number): string {
	const pct = (clamp01(p) * 100).toFixed(2);
	return `color-mix(in oklab, ${to} ${pct}%, ${from})`;
}
