import { afterEach, describe, expect, test } from "bun:test";
import { mountSplit } from "../../global/mountSplit";
import {
	getInteractionState,
	subscribeToInteractionState,
	updateCursorFlags,
	updateInteractionState,
} from "../../global/mutable-state/interactions";
import { getMountedSplitState } from "../../global/mutable-state/splits";
import {
	across,
	fakeSplit,
	handle,
	region,
	useDomStandIns,
} from "../../global/test/fakeSplit";
import { calculateHandleAriaValues } from "../../global/utils/calculateHandleAriaValues";
import {
	createRegisteredRegion,
	hasRegionOnResize,
} from "./createRegisteredRegion";

useDomStandIns();

class StandInResizeObserver {
	static last: StandInResizeObserver | undefined;
	readonly observed: Element[] = [];

	constructor(_callback: ResizeObserverCallback) {
		StandInResizeObserver.last = this;
	}

	observe(target: Element) {
		this.observed.push(target);
	}

	disconnect() {}
}

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

describe("SplitRegion registration", () => {
	test("leaves registeredRegion.onResize undefined when onResize prop is omitted or null", () => {
		const element = {} as HTMLDivElement;
		const onResizeStable = () => {};

		const omitted = createRegisteredRegion({
			element,
			hasOnResize: hasRegionOnResize(undefined),
			id: "r1",
			idIsStable: true,
			onResizeStable,
			regionConstraints: {},
		});
		expect(omitted.onResize).toBeUndefined();

		const nulled = createRegisteredRegion({
			element,
			hasOnResize: hasRegionOnResize(null),
			id: "r2",
			idIsStable: true,
			onResizeStable,
			regionConstraints: {},
		});
		expect(nulled.onResize).toBeUndefined();

		const provided = createRegisteredRegion({
			element,
			hasOnResize: hasRegionOnResize(() => {}),
			id: "r3",
			idIsStable: true,
			onResizeStable,
			regionConstraints: {},
		});
		expect(provided.onResize).toBe(onResizeStable);
	});

	test("computes accurate ARIA bounds for the second handle in a mounted 3-region Split", () => {
		const split = fakeSplit({
			children: [
				region("left", across(0, 100)),
				handle("h1", across(100, 4)),
				region("center", across(104, 100)),
				handle("h2", across(204, 4)),
				region("right", across(208, 100)),
			],
		});
		Object.assign(split.element.ownerDocument, {
			addEventListener() {},
			removeEventListener() {},
		});
		for (const current of split.handles) {
			Object.assign(current.element, {
				addEventListener() {},
				removeEventListener() {},
			});
		}
		Object.assign(split.element.ownerDocument.defaultView ?? {}, {
			ResizeObserver: StandInResizeObserver,
		});

		const [left, center, right] = split.regions;
		if (!left || !center || !right) {
			throw new Error("Expected 3 regions");
		}
		left.regionConstraints = { minSize: "20%", maxSize: "50%" };
		center.regionConstraints = { minSize: "15%", maxSize: "60%" };
		right.regionConstraints = { minSize: "25%", maxSize: "70%" };

		const unmount = mountSplit(split);
		cleanups.push(unmount);

		// None of the regions provided onResize, so only the Split element is observed.
		expect(StandInResizeObserver.last?.observed).toEqual([split.element]);

		const state = getMountedSplitState(split.id, true);
		const secondHandle = split.handles[1];
		if (!secondHandle) {
			throw new Error("Expected second handle");
		}
		const handleRegions = state.handleToRegions.get(secondHandle);
		if (!handleRegions) {
			throw new Error("Expected regions for second handle");
		}
		const [primaryRegion] = handleRegions;
		expect(primaryRegion.id).toBe("center");

		expect(
			calculateHandleAriaValues({
				layout: { left: 30, center: 35, right: 35 },
				regionConstraints: state.derivedRegionConstraints,
				regionId: primaryRegion.id,
			}),
		).toEqual({
			valueControls: "center",
			valueMin: 15,
			valueMax: 45,
			valueNow: 35,
		});
	});
});

describe("interaction state guards", () => {
	test("updateCursorFlags does not emit when flags are unchanged", () => {
		const saved = getInteractionState();
		cleanups.push(() => updateInteractionState(saved));

		updateInteractionState({ cursorFlags: 0, state: "inactive" });
		let emissions = 0;
		const unsubscribe = subscribeToInteractionState(() => {
			emissions++;
		});
		cleanups.push(unsubscribe);

		updateCursorFlags(0);
		expect(emissions).toBe(0);

		updateCursorFlags(1);
		expect(emissions).toBe(1);

		updateCursorFlags(1);
		expect(emissions).toBe(1);
	});
});
