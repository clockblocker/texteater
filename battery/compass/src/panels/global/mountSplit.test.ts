import { afterEach, describe, expect, test } from "bun:test";
import type { RegionSize, RegisteredRegion } from "../components/region/types";
import type { RegisteredSplit } from "../components/split/types";
import { mountSplit } from "./mountSplit";
import {
	deleteMutableSplit,
	getMountedSplitState,
	getMountedSplits,
	subscribeToMountedSplit,
	updateMountedSplit,
} from "./mutable-state/splits";
import { across, fakeSplit, region, useDomStandIns } from "./test/fakeSplit";

useDomStandIns();

type Events = Parameters<Parameters<typeof subscribeToMountedSplit>[1]>[0][];

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

/** Records the callback a Split's ResizeObserver is built with. */
class StandInResizeObserver {
	static last: StandInResizeObserver | undefined;
	readonly callback: ResizeObserverCallback;
	readonly observed: Element[] = [];

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
		StandInResizeObserver.last = this;
	}

	observe(target: Element) {
		this.observed.push(target);
	}

	disconnect() {}
}

const listeners = {
	addEventListener() {},
	removeEventListener() {},
};

/**
 * `a | b` along a horizontal Split, 100px each, mounted with `mountSplit`.
 * `constraints` are a Region's props, and `onResize` lists the Regions that
 * report their resizes. `resize(sizes)` re-sizes Regions in pixels; `fire`
 * runs the ResizeObserver callback for the Split or a Region.
 */
function mounted({
	constraints = {},
	sizes = { a: 100, b: 100 },
	onResize = [],
}: {
	constraints?: Record<string, RegisteredRegion["regionConstraints"]>;
	sizes?: Record<"a" | "b", number>;
	onResize?: string[];
} = {}) {
	const split = fakeSplit({
		children: [
			region("a", across(0, sizes.a)),
			region("b", across(100, sizes.b)),
		],
	});
	const document = split.element.ownerDocument;
	Object.assign(document, listeners);
	Object.assign(document.defaultView ?? {}, {
		ResizeObserver: StandInResizeObserver,
	});
	const resized: {
		id: string | number | undefined;
		next: RegionSize;
		prev: RegionSize | undefined;
	}[] = [];
	for (const current of split.regions) {
		current.regionConstraints = constraints[current.id] ?? {};
		if (onResize.includes(current.id)) {
			current.onResize = (next, id, prev) => {
				resized.push({ id, next, prev });
			};
		}
	}

	const unmount = mountSplit(split);
	const observer = StandInResizeObserver.last;
	if (!observer) {
		throw new Error("mountSplit builds a ResizeObserver");
	}
	const events: Events = [];
	const unsubscribe = subscribeToMountedSplit(split.id, (event) => {
		events.push(event);
	});
	let isMounted = true;
	const unmountOnce = () => {
		if (isMounted) {
			isMounted = false;
			unmount();
		}
	};
	cleanups.push(() => {
		unsubscribe();
		unmountOnce();
	});

	const elementOf = (id: string) => {
		const found = split.regions.find((current) => current.id === id);
		if (!found) {
			throw new Error(`The fixture Split has no ${id}`);
		}
		return found.element;
	};

	return {
		split,
		events,
		resized,
		observer,
		unmount: unmountOnce,
		elementOf,
		resize(next: Partial<Record<"a" | "b", number>>) {
			for (const [id, width] of Object.entries(next)) {
				Object.assign(elementOf(id), { offsetWidth: width });
			}
		},
		fire(...targets: ("split" | "a" | "b")[]) {
			const entries = targets.map((target) => ({
				target: target === "split" ? split.element : elementOf(target),
				borderBoxSize: [{ inlineSize: 0, blockSize: 0 }],
			}));
			// A stand-in: the callback reads only `target` and `borderBoxSize`.
			observer.callback(
				entries as unknown as ResizeObserverEntry[],
				observer as unknown as ResizeObserver,
			);
		},
	};
}

const stateOf = (split: RegisteredSplit) => getMountedSplitState(split.id);

const changes = (events: Events) =>
	events.map(({ isUserInteraction, next }) => ({
		isUserInteraction,
		defaultLayoutDeferred: next.defaultLayoutDeferred,
		splitSize: next.splitSize,
		layout: next.layout,
	}));

describe("mountSplit's resize callback", () => {
	test("a Split resize stores the new size and the constraints derived from it", () => {
		const { split, events, resize, fire } = mounted({
			constraints: { a: { minSize: "50px" } },
		});
		expect(stateOf(split)?.derivedRegionConstraints[0]?.minSize).toBe(25);
		const { handleToRegions } = stateOf(split) ?? {};

		resize({ a: 200, b: 200 });
		fire("split");

		expect(changes(events)).toEqual([
			{
				isUserInteraction: false,
				defaultLayoutDeferred: false,
				splitSize: 400,
				layout: { a: 50, b: 50 },
			},
		]);
		expect(stateOf(split)?.derivedRegionConstraints[0]?.minSize).toBe(12.5);
		expect(stateOf(split)?.handleToRegions).toBe(handleToRegions);
	});

	test("a Split resize keeps a preserve-pixel-size Region's pixels", () => {
		const { split, events, resize, fire } = mounted({
			constraints: { a: { splitResizeBehavior: "preserve-pixel-size" } },
		});
		const state = stateOf(split);
		if (!state) {
			throw new Error("The Split is mounted");
		}
		updateMountedSplit(split, { ...state, layout: { a: 25, b: 75 } });
		events.splice(0);

		resize({ a: 50, b: 50 });
		fire("split");

		expect(changes(events)).toEqual([
			{
				isUserInteraction: false,
				defaultLayoutDeferred: false,
				splitSize: 100,
				layout: { a: 50, b: 50 },
			},
		]);
	});

	test("an unchanged Split stores nothing and goes on to the next entry", () => {
		const { events, resized, fire } = mounted({ onResize: ["a"] });

		fire("split", "a");

		expect(events).toEqual([]);
		expect(resized).toEqual([
			{
				id: "a",
				next: { asPercentage: 50, inPixels: 100 },
				prev: undefined,
			},
		]);
	});

	test("a changed constraint alone revalidates and stores the layout", () => {
		const { split, events, fire } = mounted();
		const a = split.regions[0];
		if (!a) {
			throw new Error("The fixture Split has a");
		}

		a.regionConstraints = { maxSize: "40%" };
		fire("split");

		expect(changes(events)).toEqual([
			{
				isUserInteraction: false,
				defaultLayoutDeferred: false,
				splitSize: 200,
				layout: { a: 40, b: 60 },
			},
		]);
	});

	test("an invalid stored layout alone is revalidated and stored", () => {
		const { split, events, fire } = mounted({
			constraints: { a: { minSize: "10%" } },
		});
		const state = stateOf(split);
		if (!state) {
			throw new Error("The Split is mounted");
		}
		updateMountedSplit(split, { ...state, layout: { a: 5, b: 95 } });
		events.splice(0);

		fire("split");

		expect(changes(events).map(({ layout }) => layout)).toEqual([
			{ a: 10, b: 90 },
		]);
	});

	test("a stale stored Split size alone is replaced", () => {
		const { split, events, fire } = mounted();
		const state = stateOf(split);
		if (!state) {
			throw new Error("The Split is mounted");
		}
		updateMountedSplit(split, { ...state, splitSize: 999 });
		events.splice(0);

		fire("split");

		expect(changes(events).map(({ splitSize }) => splitSize)).toEqual([
			200,
		]);
	});

	test("a deferred default layout is computed from the constraints, not the stored layout", () => {
		const { split, events, fire } = mounted({
			constraints: { a: { defaultSize: "30%" } },
		});
		const state = stateOf(split);
		if (!state) {
			throw new Error("The Split is mounted");
		}
		updateMountedSplit(split, {
			...state,
			defaultLayoutDeferred: true,
			layout: { a: 50, b: 50 },
		});
		events.splice(0);

		fire("split");

		expect(changes(events)).toEqual([
			{
				isUserInteraction: false,
				defaultLayoutDeferred: false,
				splitSize: 200,
				layout: { a: 30, b: 70 },
			},
		]);
	});

	test("a deferred layout is stored even when nothing else changed", () => {
		const { split, events, fire } = mounted();
		const state = stateOf(split);
		if (!state) {
			throw new Error("The Split is mounted");
		}
		updateMountedSplit(split, { ...state, defaultLayoutDeferred: true });
		events.splice(0);

		fire("split");

		expect(changes(events)).toEqual([
			{
				isUserInteraction: false,
				defaultLayoutDeferred: false,
				splitSize: 200,
				layout: { a: 50, b: 50 },
			},
		]);
	});

	test("a Split mounted at zero size defers its default layout until it has a size", () => {
		const { split, events, resize, fire } = mounted({
			constraints: { a: { defaultSize: "25%" } },
			sizes: { a: 0, b: 0 },
		});
		expect(stateOf(split)?.defaultLayoutDeferred).toBe(true);

		resize({ a: 100, b: 100 });
		fire("split");

		expect(changes(events)).toEqual([
			{
				isUserInteraction: false,
				defaultLayoutDeferred: false,
				splitSize: 200,
				layout: { a: 25, b: 75 },
			},
		]);
	});

	test("a zero-size Split stores nothing, and its later Region entry reports no size it can't measure", () => {
		const { events, resized, resize, fire } = mounted({ onResize: ["a"] });

		resize({ a: 0, b: 0 });
		fire("split", "a");

		expect(events).toEqual([]);
		expect(resized).toEqual([]);
	});

	test("a Split no longer in the store stores nothing and goes on to the batch's later entries", () => {
		const { split, events, resized, fire } = mounted({ onResize: ["a"] });
		deleteMutableSplit(split);

		fire("split", "a");

		expect(events).toEqual([]);
		expect(resized).toEqual([
			{
				id: "a",
				next: { asPercentage: 50, inPixels: 100 },
				prev: undefined,
			},
		]);
		expect(stateOf(split)).toBeUndefined();
	});

	test("a lone Region entry at Split size 0 reports nothing and keeps the last measured size as prev", () => {
		const { resized, resize, fire } = mounted({ onResize: ["a"] });
		fire("a");

		resize({ a: 0, b: 0 });
		fire("a");
		resize({ a: 50, b: 150 });
		fire("a");

		expect(resized).toEqual([
			{
				id: "a",
				next: { asPercentage: 50, inPixels: 100 },
				prev: undefined,
			},
			{
				id: "a",
				next: { asPercentage: 25, inPixels: 50 },
				prev: { asPercentage: 50, inPixels: 100 },
			},
		]);
	});

	test("an unmounted Split's callback leaves a remounted Split with its id alone", () => {
		const first = mounted();
		first.unmount();
		const second = mounted({ constraints: { a: { maxSize: "40%" } } });
		const before = stateOf(second.split);

		first.resize({ a: 300, b: 300 });
		first.fire("split");

		expect(getMountedSplits().has(first.split)).toBe(false);
		expect(second.events).toEqual([]);
		expect(stateOf(second.split)).toBe(before);
	});

	test("a Region entry reports the Region's new size", () => {
		const { resized, observer, split, elementOf, resize, fire } = mounted({
			onResize: ["b"],
		});
		expect(observer.observed).toEqual([split.element, elementOf("b")]);

		resize({ b: 300 });
		fire("b");

		expect(resized).toEqual([
			{
				id: "b",
				next: { asPercentage: 75, inPixels: 300 },
				prev: undefined,
			},
		]);
	});
});
