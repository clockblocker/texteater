import { frame } from "motion/react";
import { useSyncExternalStore } from "react";

type Phase = "rest" | "pressed" | "carrying" | "settling" | "expanded" | "gone";

export type Readout = {
	readonly phase: Phase;
	/** The zone a release now would pick, or null at rest. */
	readonly zone: string | null;
	/** Physical px/ms. */
	readonly velocity: { readonly x: number; readonly y: number };
	/** The last release's decision and its reason. */
	readonly outcome: string | null;
};

const REST: Readout = {
	phase: "rest",
	zone: null,
	velocity: { x: 0, y: 0 },
	outcome: null,
};

/**
 * The live readouts, outside React state: a drag writes them every
 * pointer move, and only what subscribes re-renders, at most once a
 * frame and only when something changed. A write lands at once, so `get`
 * reads it straight away; what subscribers render, `shown`, catches up
 * after the frame draws, on Motion's frame loop, so a drag's moves never
 * render the inspector between two frames.
 */
export type Readouts = {
	/** The readouts with every write in. */
	readonly get: () => Readout;
	/** The readouts as subscribers last rendered them. */
	readonly shown: () => Readout;
	readonly set: (patch: Partial<Readout>) => void;
	readonly subscribe: (listener: () => void) => () => void;
};

/** Whether `patch` would leave `current` as it is: a velocity by its x and y, the rest by value. */
function unchanged(current: Readout, patch: Partial<Readout>): boolean {
	return (Object.keys(patch) as (keyof Readout)[]).every((key) => {
		if (key !== "velocity") return patch[key] === current[key];
		const next = patch.velocity;
		return (
			next === undefined ||
			(next.x === current.velocity.x && next.y === current.velocity.y)
		);
	});
}

export function createReadouts(): Readouts {
	let current = REST;
	let shown = REST;
	const listeners = new Set<() => void>();
	/* once a frame however many writes came in it: the frame loop runs a
	   callback scheduled twice for one frame once */
	const publish = () => {
		if (shown === current) return;
		shown = current;
		for (const listener of listeners) listener();
	};
	return {
		get: () => current,
		shown: () => shown,
		set: (patch) => {
			if (unchanged(current, patch)) return;
			current = { ...current, ...patch };
			frame.postRender(publish);
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export function useReadout(readouts: Readouts): Readout {
	return useSyncExternalStore(readouts.subscribe, readouts.shown);
}
