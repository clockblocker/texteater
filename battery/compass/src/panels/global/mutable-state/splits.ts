import type { RegionConstraints } from "../../components/region/types";
import type { Layout, RegisteredSplit } from "../../components/split/types";
import { EventEmitter } from "../../utils/EventEmitter";
import type { HandleToRegionsMap } from "./types";

type State = {
	defaultLayoutDeferred: boolean;
	derivedRegionConstraints: RegionConstraints[];
	splitSize: number;
	layout: Layout;
	handleToRegions: HandleToRegionsMap;
};

export type MountedSplits = Map<RegisteredSplit, State>;

let map: MountedSplits = new Map();

type SplitChangeEvent = {
	split: RegisteredSplit;
	// True if the change was triggered by a pointer or keyboard event handler
	// False for other types of resize (constraint recompute, default-size change, imperative API, etc.).
	isUserInteraction: boolean;
	next: State;
	prev: State | undefined;
};
type SplitsChangeEvent = {
	next: MountedSplits;
	prev: MountedSplits;
};

const eventEmitter = new EventEmitter<{
	splitChange: SplitChangeEvent;
	splitsChange: SplitsChangeEvent;
}>();

export function deleteMutableSplit(split: RegisteredSplit) {
	map = new Map(map);
	map.delete(split);
}

export function getRegisteredSplit(
	splitId: string,
): RegisteredSplit | undefined;
export function getRegisteredSplit(
	splitId: string,
	assert: true,
): RegisteredSplit;
export function getRegisteredSplit(splitId: string, assert?: boolean) {
	for (const [split] of map) {
		if (split.id === splitId) {
			return split;
		}
	}

	if (assert) {
		throw Error(`Could not find data for Split with id ${splitId}`);
	}

	return undefined;
}

export function getMountedSplitState(splitId: string): State | undefined;
export function getMountedSplitState(splitId: string, assert: true): State;
export function getMountedSplitState(splitId: string, assert?: boolean) {
	for (const [split, mountedSplit] of map) {
		if (split.id === splitId) {
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
	callback: (event: SplitChangeEvent) => void,
) {
	return eventEmitter.addListener("splitChange", (event) => {
		if (event.split.id === splitId) {
			callback(event);
		}
	});
}

export function updateMountedSplit(
	split: RegisteredSplit,
	next: State,
	meta?: { isUserInteraction?: boolean },
) {
	const prev = map.get(split);

	map = new Map(map);
	map.set(split, next);

	eventEmitter.emit("splitChange", {
		split,
		isUserInteraction: meta?.isUserInteraction === true,
		prev,
		next,
	});
}
