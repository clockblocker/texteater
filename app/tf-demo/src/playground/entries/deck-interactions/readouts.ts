import { useSyncExternalStore } from "react";
import type { Point } from "./geometry";

type Phase = "rest" | "pressed" | "carrying" | "settling" | "expanded" | "gone";

export type Readout = {
	readonly phase: Phase;
	/** The zone a release now would pick, or null at rest. */
	readonly zone: string | null;
	/** Physical px/ms. */
	readonly velocity: { readonly x: number; readonly y: number };
	readonly tilt: number;
	/** The last release's decision and its reason. */
	readonly outcome: string | null;
	/** The projected endpoint of the Card's centre, logical, in the frame. */
	readonly projected: Point | null;
};

const REST: Readout = {
	phase: "rest",
	zone: null,
	velocity: { x: 0, y: 0 },
	tilt: 0,
	outcome: null,
	projected: null,
};

/**
 * The live readouts, outside React state: a drag writes them every
 * pointer move, and only what subscribes re-renders.
 */
export type Readouts = {
	readonly get: () => Readout;
	readonly set: (patch: Partial<Readout>) => void;
	readonly subscribe: (listener: () => void) => () => void;
};

export function createReadouts(): Readouts {
	let current = REST;
	const listeners = new Set<() => void>();
	return {
		get: () => current,
		set: (patch) => {
			current = { ...current, ...patch };
			for (const listener of listeners) listener();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export function useReadout(readouts: Readouts): Readout {
	return useSyncExternalStore(readouts.subscribe, readouts.get);
}
