import { deriveKeyframes, type Keyframe } from "./keyframes";
import { DEFAULT_PARAMS, type Params } from "./motion";
import type { AnyScene, Knob, Where } from "./scene";
import { SCENE_GROUPS } from "./scenes";
import { SWAP_SOURCE } from "./swap";

/**
 * CATALOG — every animation in tf-demo as one flat list, addressed by key.
 *
 * The workbench shows exactly one animation at a time, so the catalog is
 * what the index lists and what a stage looks itself up in. The deck's Swap
 * is the one entry without a scene: it is tap-driven and does not animate
 * at all, so the stage draws it through `swap.ts` instead of `scene.frame`
 * and its timeline is zero.
 */

export const SWAP_KEY = "swap";

export type Entry = {
	readonly key: string;
	readonly title: string;
	/** Where this motion ships, so a change here can be carried back. */
	readonly source: string;
	readonly where: Where;
	/** The scene this entry plays, or null for the deck's Swap. */
	readonly scene: AnyScene | null;
	readonly knobs: readonly Knob[];
};

export type Section = {
	readonly title: string;
	readonly entries: readonly Entry[];
};

export const SECTIONS: readonly Section[] = [
	{
		title: "Tap",
		entries: [
			{
				key: SWAP_KEY,
				title: "Swap",
				source: SWAP_SOURCE,
				where: "playground",
				scene: null,
				knobs: [],
			},
		],
	},
	...SCENE_GROUPS.map((group) => ({
		title: group.title,
		entries: group.scenes.map((scene) => ({
			key: scene.key,
			title: scene.title,
			source: scene.source,
			where: scene.where,
			scene,
			knobs: scene.knobs,
		})),
	})),
];

export const ENTRIES: readonly Entry[] = SECTIONS.flatMap(
	(section) => section.entries,
);

export function entryFor(key: string | undefined): Entry | null {
	return ENTRIES.find((entry) => entry.key === key) ?? null;
}

/** The entry `step` places along the catalog from `key`, wrapping. */
export function neighbour(key: string, step: number): Entry | null {
	const at = ENTRIES.findIndex((entry) => entry.key === key);
	if (at < 0 || ENTRIES.length === 0) return null;
	const count = ENTRIES.length;
	return ENTRIES[(((at + step) % count) + count) % count] ?? null;
}

/* ------------------------------------------------------------- timings */

export type Timing = {
	/** The timeline, in ms. */
	readonly length: number;
	/** The instants at which something happens, derived from the frame. */
	readonly keys: readonly Keyframe[];
};

/**
 * One entry's timeline at the accepted settings. The index draws every
 * animation against the longest of these, so two bars are to scale.
 */
export function timingFor(entry: Entry, params: Params): Timing {
	const scene = entry.scene;
	/* Swap: a state, not a move. Nothing happens over time, so nothing
	   is drawn on the axis. */
	if (!scene) return { length: 0, keys: [] };
	const length = scene.length(params);
	return {
		length,
		keys: deriveKeyframes((t) => scene.frame(t, params), length).keys,
	};
}

export function catalogTimings(): ReadonlyMap<string, Timing> {
	return new Map(
		ENTRIES.map((entry) => [entry.key, timingFor(entry, DEFAULT_PARAMS)]),
	);
}
