import type { RegionConstraints } from "../../components/region/types";
import type { Layout, RegisteredSplit } from "../../components/split/types";
import type { HandleToRegionsMap } from "./types";

export type MountedSplitState = {
	defaultLayoutDeferred: boolean;
	derivedRegionConstraints: RegionConstraints[];
	splitSize: number;
	layout: Layout;
	handleToRegions: HandleToRegionsMap;
};

export type MountedSplits = Map<RegisteredSplit, MountedSplitState>;

const map: MountedSplits = new Map();
const splitsById = new Map<string, RegisteredSplit>();

type SplitChangeEvent = {
	split: RegisteredSplit;
	// True if the change was triggered by a pointer or keyboard event handler
	// False for other types of resize (constraint recompute, default-size change, imperative API, etc.).
	isUserInteraction: boolean;
	next: MountedSplitState;
	prev: MountedSplitState | undefined;
};

type SplitChangeListener = (event: SplitChangeEvent) => void;
const listenersBySplitId = new Map<string, Set<SplitChangeListener>>();

export function deleteMutableSplit(split: RegisteredSplit) {
	map.delete(split);
	if (splitsById.get(split.id) === split) {
		splitsById.delete(split.id);
		for (const [remaining] of map) {
			if (remaining.id === split.id) {
				splitsById.set(remaining.id, remaining);
				break;
			}
		}
	}
}

export function getRegisteredSplit(
	splitId: string,
): RegisteredSplit | undefined;
export function getRegisteredSplit(
	splitId: string,
	assert: true,
): RegisteredSplit;
export function getRegisteredSplit(splitId: string, assert?: boolean) {
	const split = splitsById.get(splitId);
	if (split) {
		return split;
	}

	if (assert) {
		throw Error(`Could not find data for Split with id ${splitId}`);
	}

	return undefined;
}

export function getMountedSplitState(
	splitId: string,
): MountedSplitState | undefined;
export function getMountedSplitState(
	splitId: string,
	assert: true,
): MountedSplitState;
export function getMountedSplitState(splitId: string, assert?: boolean) {
	const split = splitsById.get(splitId);
	if (split) {
		const mountedSplit = map.get(split);
		if (mountedSplit) {
			return mountedSplit;
		}
	}

	if (assert) {
		throw Error(`Could not find data for Split with id ${splitId}`);
	}

	return undefined;
}

export function getMountedSplits() {
	return map;
}

export function subscribeToMountedSplit(
	splitId: string,
	callback: SplitChangeListener,
) {
	let listeners = listenersBySplitId.get(splitId);
	if (!listeners) {
		listeners = new Set();
		listenersBySplitId.set(splitId, listeners);
	}
	listeners.add(callback);

	return () => {
		listeners.delete(callback);
		if (listeners.size === 0) {
			listenersBySplitId.delete(splitId);
		}
	};
}

export function updateMountedSplit(
	split: RegisteredSplit,
	next: MountedSplitState,
	meta?: { isUserInteraction?: boolean },
) {
	const prev = map.get(split);

	map.set(split, next);
	splitsById.set(split.id, split);

	const listeners = listenersBySplitId.get(split.id);
	if (!listeners || listeners.size === 0) {
		return;
	}

	const event: SplitChangeEvent = {
		split,
		isUserInteraction: meta?.isUserInteraction === true,
		prev,
		next,
	};

	let didThrow = false;
	let caughtError: unknown = null;
	for (const listener of Array.from(listeners)) {
		try {
			listener(event);
		} catch (error) {
			if (!didThrow) {
				didThrow = true;
				caughtError = error;
			}
		}
	}
	if (didThrow) {
		throw caughtError;
	}
}
