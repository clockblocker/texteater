import { afterEach, describe, expect, test } from "bun:test";
import type { RegisteredHandle } from "../../components/handle/types";
import type {
	RegionConstraints,
	RegisteredRegion,
} from "../../components/region/types";
import type { Layout, RegisteredSplit } from "../../components/split/types";
import {
	deleteMutableSplit,
	getMountedSplitState,
	subscribeToMountedSplit,
	updateMountedSplit,
} from "../mutable-state/splits";
import {
	across,
	fakeSplit,
	handle,
	region,
	useDomStandIns,
} from "../test/fakeSplit";
import { adjustLayoutForHandle } from "./adjustLayoutForHandle";

useDomStandIns();

type Events = Parameters<Parameters<typeof subscribeToMountedSplit>[1]>[0][];

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
});

function byId<T extends { id: string }>(items: T[], id: string): T {
	const item = items.find((current) => current.id === id);
	if (!item) {
		throw new Error(`The fixture Split has no ${id}`);
	}
	return item;
}

/**
 * `a | h1 | b | h2 | c`, mounted at `layout`, where `h1` resizes a and b and
 * `h2` resizes `h2Regions` (b and c). Each Region is 10–60% unless
 * `constraints` says otherwise. Returns the events the Split emits; cleanup
 * unmounts it.
 */
function mountedSplit({
	layout,
	constraints = {},
	h2Regions = ["b", "c"],
}: {
	layout: Layout;
	constraints?: Record<string, Partial<RegionConstraints>>;
	h2Regions?: [string, string];
}) {
	const split = fakeSplit({
		children: [
			region("a", across(0, 100)),
			handle("h1", across(100, 4)),
			region("b", across(104, 100)),
			handle("h2", across(204, 4)),
			region("c", across(208, 100)),
		],
	});
	const region_ = (id: string) => byId(split.regions, id);
	const handle_ = (id: string) => byId(split.handles, id);
	const handleToRegions = new Map<
		RegisteredHandle,
		[RegisteredRegion, RegisteredRegion]
	>([
		[handle_("h1"), [region_("a"), region_("b")]],
		[handle_("h2"), [region_(h2Regions[0]), region_(h2Regions[1])]],
	]);
	updateMountedSplit(split, {
		defaultLayoutDeferred: false,
		derivedRegionConstraints: split.regions.map(({ id }) => ({
			collapsedSize: 0,
			collapsible: false,
			defaultSize: undefined,
			disabled: undefined,
			maxSize: 60,
			minSize: 10,
			...constraints[id],
			regionId: id,
		})),
		splitSize: 308,
		layout,
		handleToRegions,
	});

	const events: Events = [];
	const unsubscribe = subscribeToMountedSplit(split.id, (event) => {
		events.push(event);
	});
	cleanups.push(() => {
		unsubscribe();
		deleteMutableSplit(split);
	});

	return {
		split,
		events,
		handleElement: (id: string) => handle_(id).element,
	};
}

const layoutOf = (split: RegisteredSplit) =>
	getMountedSplitState(split.id)?.layout;

describe("adjustLayoutForHandle", () => {
	test("resizes the two Regions the Handle maps to", () => {
		const { split, handleElement } = mountedSplit({
			layout: { a: 30, b: 40, c: 30 },
		});

		adjustLayoutForHandle(handleElement("h2"), 10);

		expect(layoutOf(split)).toEqual({ a: 30, b: 50, c: 20 });
	});

	test("takes the pivots from handleToRegions, not the Handle's place", () => {
		const { split, handleElement } = mountedSplit({
			layout: { a: 30, b: 40, c: 30 },
			h2Regions: ["a", "c"],
		});

		adjustLayoutForHandle(handleElement("h2"), 10);

		expect(layoutOf(split)).toEqual({ a: 40, b: 40, c: 20 });
	});

	test("resizes as a keyboard trigger, collapsing a Region at its minimum", () => {
		const { split, handleElement } = mountedSplit({
			layout: { a: 30, b: 50, c: 20 },
			constraints: {
				b: { maxSize: 90 },
				c: { collapsible: true, minSize: 20 },
			},
		});

		adjustLayoutForHandle(handleElement("h2"), 5);

		expect(layoutOf(split)).toEqual({ a: 30, b: 70, c: 0 });
	});

	test("emits the change as a user interaction", () => {
		const { events, handleElement } = mountedSplit({
			layout: { a: 30, b: 40, c: 30 },
		});

		adjustLayoutForHandle(handleElement("h1"), -10);

		expect(
			events.map(({ isUserInteraction, prev, next }) => ({
				isUserInteraction,
				prev: prev?.layout,
				next: next.layout,
			})),
		).toEqual([
			{
				isUserInteraction: true,
				prev: { a: 30, b: 40, c: 30 },
				next: { a: 20, b: 50, c: 30 },
			},
		]);
	});

	test("emits nothing when the layout cannot change", () => {
		const { split, events, handleElement } = mountedSplit({
			layout: { a: 30, b: 60, c: 10 },
		});

		adjustLayoutForHandle(handleElement("h2"), 10);

		expect(events).toEqual([]);
		expect(layoutOf(split)).toEqual({ a: 30, b: 60, c: 10 });
	});

	test("throws for a Handle no mounted Split holds", () => {
		mountedSplit({ layout: { a: 30, b: 40, c: 30 } });
		const stray = fakeSplit({
			children: [handle("x", across(0, 4))],
		}).handles[0]?.element;
		if (!stray) {
			throw new Error("The stray Split has one Handle");
		}

		expect(() => adjustLayoutForHandle(stray, 10)).toThrow(
			"Could not find parent Split for handle element",
		);
	});
});
