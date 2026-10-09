import { afterEach, describe, expect, test } from "bun:test";
import type { RegisteredHandle } from "../../components/handle/types";
import type {
	RegionConstraints,
	RegisteredRegion,
} from "../../components/region/types";
import type {
	Layout,
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import {
	deleteMutableSplit,
	getMountedSplitState,
	updateMountedSplit,
} from "../mutable-state/splits";
import {
	across,
	fakeSplit,
	handle,
	region,
	useDomStandIns,
} from "../test/fakeSplit";
import { onDocumentKeyDown } from "./onDocumentKeyDown";

useDomStandIns();

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
 * `h2` resizes b and c, unless `handleToRegions` maps them otherwise. Each
 * Region is 10–60% unless `constraints` says otherwise. Each Handle records
 * the focus calls it gets. `fourth` appends `| h3 | d`.
 */
function mountedSplit({
	layout,
	orientation = "horizontal",
	direction = "ltr",
	disabled = false,
	constraints = {},
	handleToRegions = { h1: ["a", "b"], h2: ["b", "c"] },
	expandedRegionSizes = {},
	fourth = false,
}: {
	layout: Layout;
	orientation?: Orientation;
	direction?: "ltr" | "rtl";
	disabled?: boolean;
	constraints?: Record<string, Partial<RegionConstraints>>;
	handleToRegions?: Record<string, [string, string]>;
	expandedRegionSizes?: Record<string, number>;
	fourth?: boolean;
}) {
	const split = fakeSplit({
		children: [
			region("a", across(0, 100)),
			handle("h1", across(100, 4)),
			region("b", across(104, 100)),
			handle("h2", across(204, 4)),
			region("c", across(208, 100)),
			...(fourth
				? [handle("h3", across(308, 4)), region("d", across(312, 100))]
				: []),
		],
		orientation,
		direction,
		disabled,
	});
	split.mutableState.expandedRegionSizes = expandedRegionSizes;
	const focused: { id: string; options: FocusOptions | undefined }[] = [];
	for (const { id, element } of split.handles) {
		element.focus = (options) => {
			focused.push({ id, options });
		};
	}
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
		handleToRegions: new Map<
			RegisteredHandle,
			[RegisteredRegion, RegisteredRegion]
		>(
			Object.entries(handleToRegions).map(
				([handleId, [first, second]]) => [
					byId(split.handles, handleId),
					[byId(split.regions, first), byId(split.regions, second)],
				],
			),
		),
	});
	cleanups.push(() => deleteMutableSplit(split));

	return { split, focused };
}

type KeyDown = {
	event: KeyboardEvent;
	prevented: () => boolean;
};

/** A keydown on `handleId`'s element, recording whether it was prevented. */
function keyDown(
	split: RegisteredSplit,
	handleId: string,
	key: string,
	{
		shiftKey = false,
		defaultPrevented = false,
	}: { shiftKey?: boolean; defaultPrevented?: boolean } = {},
): KeyDown {
	let prevented = false;
	const event = {
		currentTarget: byId(split.handles, handleId).element,
		defaultPrevented,
		key,
		shiftKey,
		preventDefault: () => {
			prevented = true;
		},
	};
	// A stand-in: the handler reads only the members above.
	return {
		event: event as unknown as KeyboardEvent,
		prevented: () => prevented,
	};
}

function press(
	split: RegisteredSplit,
	handleId: string,
	key: string,
	options?: { shiftKey?: boolean; defaultPrevented?: boolean },
) {
	const { event, prevented } = keyDown(split, handleId, key, options);
	onDocumentKeyDown(event);
	return { layout: getMountedSplitState(split.id)?.layout, prevented };
}

const evenLayout = { a: 30, b: 40, c: 30 };

describe("onDocumentKeyDown", () => {
	test("ignores an event that is already prevented", () => {
		const { split } = mountedSplit({ layout: evenLayout });

		const { layout, prevented } = press(split, "h1", "ArrowRight", {
			defaultPrevented: true,
		});

		expect(layout).toEqual(evenLayout);
		expect(prevented()).toBe(false);
	});

	test("ignores every key on a disabled Split", () => {
		const { split } = mountedSplit({ layout: evenLayout, disabled: true });

		for (const key of ["ArrowRight", "End", "Enter", "F6"]) {
			const { layout, prevented } = press(split, "h1", key);
			expect(layout).toEqual(evenLayout);
			expect(prevented()).toBe(false);
		}
	});

	test("leaves other keys alone", () => {
		const { split } = mountedSplit({ layout: evenLayout });

		const { layout, prevented } = press(split, "h1", "a");

		expect(layout).toEqual(evenLayout);
		expect(prevented()).toBe(false);
	});

	test("the arrows along a horizontal Split move the Handle 5% the way they point", () => {
		const { split } = mountedSplit({ layout: evenLayout });

		expect(press(split, "h1", "ArrowRight").layout).toEqual({
			a: 35,
			b: 35,
			c: 30,
		});
		expect(press(split, "h1", "ArrowLeft").layout).toEqual(evenLayout);
	});

	test("under rtl the horizontal arrows flip their delta", () => {
		const { split } = mountedSplit({
			layout: evenLayout,
			direction: "rtl",
		});

		expect(press(split, "h1", "ArrowLeft").layout).toEqual({
			a: 35,
			b: 35,
			c: 30,
		});
		expect(press(split, "h1", "ArrowRight").layout).toEqual(evenLayout);
	});

	test("the arrows along a vertical Split move the Handle 5% the way they point", () => {
		const { split } = mountedSplit({
			layout: evenLayout,
			orientation: "vertical",
		});

		expect(press(split, "h1", "ArrowDown").layout).toEqual({
			a: 35,
			b: 35,
			c: 30,
		});
		expect(press(split, "h1", "ArrowUp").layout).toEqual(evenLayout);
	});

	test("an arrow across the Split's orientation is prevented but moves nothing", () => {
		const horizontal = mountedSplit({ layout: evenLayout }).split;
		for (const key of ["ArrowDown", "ArrowUp"]) {
			const { layout, prevented } = press(horizontal, "h1", key);
			expect(layout).toEqual(evenLayout);
			expect(prevented()).toBe(true);
		}
		cleanups.splice(0).forEach((cleanup) => {
			cleanup();
		});

		const vertical = mountedSplit({
			layout: evenLayout,
			orientation: "vertical",
		}).split;
		for (const key of ["ArrowLeft", "ArrowRight"]) {
			const { layout, prevented } = press(vertical, "h1", key);
			expect(layout).toEqual(evenLayout);
			expect(prevented()).toBe(true);
		}
	});

	test("End and Home move the Handle as far as the constraints allow", () => {
		const { split } = mountedSplit({ layout: evenLayout });

		const end = press(split, "h1", "End");
		expect(end.layout).toEqual({ a: 60, b: 10, c: 30 });
		expect(end.prevented()).toBe(true);

		const home = press(split, "h1", "Home");
		expect(home.layout).toEqual({ a: 10, b: 60, c: 30 });
		expect(home.prevented()).toBe(true);
	});

	test("Enter collapses an expanded collapsible primary Region", () => {
		const { split } = mountedSplit({
			layout: evenLayout,
			constraints: { a: { collapsible: true }, b: { maxSize: 90 } },
		});

		const { layout, prevented } = press(split, "h1", "Enter");

		expect(layout).toEqual({ a: 0, b: 70, c: 30 });
		expect(prevented()).toBe(true);
	});

	test("Enter collapses to the primary Region's collapsed size", () => {
		const { split } = mountedSplit({
			layout: evenLayout,
			constraints: {
				a: { collapsible: true, collapsedSize: 5 },
				b: { maxSize: 90 },
			},
		});

		expect(press(split, "h1", "Enter").layout).toEqual({
			a: 5,
			b: 65,
			c: 30,
		});
	});

	test("Enter restores a collapsed primary Region to its expanded size", () => {
		const { split } = mountedSplit({
			layout: { a: 0, b: 60, c: 40 },
			constraints: { a: { collapsible: true }, c: { maxSize: 60 } },
			expandedRegionSizes: { a: 25 },
		});

		expect(press(split, "h1", "Enter").layout).toEqual({
			a: 25,
			b: 35,
			c: 40,
		});
	});

	test("Enter restores a collapsed primary Region without an expanded size to its minimum", () => {
		const { split } = mountedSplit({
			layout: { a: 0, b: 60, c: 40 },
			constraints: { a: { collapsible: true, minSize: 15 } },
		});

		expect(press(split, "h1", "Enter").layout).toEqual({
			a: 15,
			b: 45,
			c: 40,
		});
	});

	test("Enter takes the primary Region from handleToRegions", () => {
		const { split } = mountedSplit({
			layout: evenLayout,
			constraints: { b: { maxSize: 90 }, c: { collapsible: true } },
			handleToRegions: { h1: ["a", "b"], h2: ["c", "b"] },
		});

		expect(press(split, "h2", "Enter").layout).toEqual({
			a: 30,
			b: 70,
			c: 0,
		});
	});

	test("Enter is prevented but changes nothing for a Region that is not collapsible or not in the layout", () => {
		const fixed = mountedSplit({
			layout: evenLayout,
			constraints: { b: { maxSize: 90 } },
		}).split;
		const fixedPress = press(fixed, "h1", "Enter");
		expect(fixedPress.layout).toEqual(evenLayout);
		expect(fixedPress.prevented()).toBe(true);
		cleanups.splice(0).forEach((cleanup) => {
			cleanup();
		});

		const unsized = mountedSplit({
			layout: { b: 70, c: 30 },
			constraints: { a: { collapsible: true } },
		}).split;
		expect(press(unsized, "h1", "Enter").layout).toEqual({ b: 70, c: 30 });
	});

	test("Enter throws when the Handle has no Regions or its primary Region no constraints", () => {
		const unmapped = mountedSplit({
			layout: evenLayout,
			handleToRegions: { h2: ["b", "c"] },
		}).split;
		expect(() =>
			onDocumentKeyDown(keyDown(unmapped, "h1", "Enter").event),
		).toThrow("Matching regions not found");
		cleanups.splice(0).forEach((cleanup) => {
			cleanup();
		});

		const { split } = mountedSplit({ layout: evenLayout });
		const state = getMountedSplitState(split.id, true);
		updateMountedSplit(split, {
			...state,
			derivedRegionConstraints: state.derivedRegionConstraints.filter(
				({ regionId }) => regionId !== "a",
			),
		});
		expect(() =>
			onDocumentKeyDown(keyDown(split, "h1", "Enter").event),
		).toThrow("Region metadata not found");
	});

	test("F6 focuses the next Handle, and Shift+F6 the previous one, wrapping around", () => {
		const layout = { a: 25, b: 25, c: 25, d: 25 };
		const { split, focused } = mountedSplit({ layout, fourth: true });

		const steps = [
			press(split, "h1", "F6"),
			press(split, "h3", "F6"),
			press(split, "h3", "F6", { shiftKey: true }),
			press(split, "h1", "F6", { shiftKey: true }),
		];

		expect(focused).toEqual([
			{ id: "h2", options: { preventScroll: true } },
			{ id: "h1", options: { preventScroll: true } },
			{ id: "h2", options: { preventScroll: true } },
			{ id: "h3", options: { preventScroll: true } },
		]);
		expect(steps.map(({ prevented }) => prevented())).toEqual([
			true,
			true,
			true,
			true,
		]);
		expect(getMountedSplitState(split.id)?.layout).toEqual(layout);
	});
});
