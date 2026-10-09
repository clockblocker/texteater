import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { RegionConstraints } from "../../components/region/types";
import type {
	Layout,
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import {
	CURSOR_FLAG_HORIZONTAL_MAX,
	CURSOR_FLAG_HORIZONTAL_MIN,
	CURSOR_FLAG_VERTICAL_MAX,
	CURSOR_FLAG_VERTICAL_MIN,
} from "../../constants";
import type { HitArea } from "../dom/calculateHitAreas";
import {
	getInteractionState,
	updateInteractionState,
} from "../mutable-state/interactions";
import {
	deleteMutableSplit,
	getMountedSplitState,
	type MountedSplits,
} from "../mutable-state/splits";
import type { InteractionState } from "../mutable-state/types";
import { across, fakeSplit, region, useDomStandIns } from "../test/fakeSplit";
import { updateActiveHitAreas } from "./updateActiveHitArea";

useDomStandIns();

// A stand-in: without a `defaultView`, updateCursorStyle returns at once.
const document = { defaultView: null } as unknown as Document;

/** Each Region 10–90%, so a 50/50 layout moves by up to 40 either way. */
function constraintsOf(split: RegisteredSplit): RegionConstraints[] {
	return split.regions.map(({ id }) => ({
		collapsedSize: 0,
		collapsible: false,
		defaultSize: undefined,
		disabled: undefined,
		maxSize: 90,
		minSize: 10,
		regionId: id,
	}));
}

function twoRegions(orientation: Orientation = "horizontal") {
	const split = fakeSplit({
		orientation,
		children: [region("a", across(0, 100)), region("b", across(100, 100))],
	});
	const [a, b] = split.regions;
	if (!a || !b) {
		throw new Error("The fixture Split has two Regions");
	}
	const hitArea = (rightToLeft = false): HitArea => ({
		split,
		splitSize: 200,
		regions: [a, b],
		rect: new DOMRect(95, 0, 10, 100),
		rightToLeft,
	});
	return { split, hitArea };
}

function mounted(split: RegisteredSplit, layout: Layout): MountedSplits {
	return new Map([
		[
			split,
			{
				defaultLayoutDeferred: false,
				derivedRegionConstraints: constraintsOf(split),
				splitSize: 200,
				layout,
				handleToRegions: new Map(),
			},
		],
	]);
}

const move = ({
	clientX = 0,
	clientY = 0,
	movementX = 1,
	movementY = 1,
}: Partial<Parameters<typeof updateActiveHitAreas>[0]["event"]>) => ({
	clientX,
	clientY,
	movementX,
	movementY,
});

/** Runs a drag from a 50/50 layout of `split`, both mounted and initial. */
function drag({
	split,
	hitArea,
	event,
	pointerDownAtPoint,
	layout = { a: 50, b: 50 },
	prevCursorFlags = 0,
}: {
	split: RegisteredSplit;
	hitArea: HitArea;
	event: ReturnType<typeof move>;
	pointerDownAtPoint?: { x: number; y: number };
	layout?: Layout;
	prevCursorFlags?: number;
}) {
	updateActiveHitAreas({
		document,
		event,
		hitAreas: [hitArea],
		initialLayoutMap: new Map([[split, layout]]),
		mountedSplits: mounted(split, layout),
		pointerDownAtPoint,
		prevCursorFlags,
	});
	return {
		layout: getMountedSplitState(split.id)?.layout,
		cursorFlags: getInteractionState().cursorFlags,
	};
}

const splitsWritten: RegisteredSplit[] = [];
let savedInteraction: InteractionState;

beforeEach(() => {
	savedInteraction = getInteractionState();
});

afterEach(() => {
	for (const split of splitsWritten.splice(0)) {
		deleteMutableSplit(split);
	}
	updateInteractionState(savedInteraction);
});

/** A two-Region Split whose mounted state the test's cleanup removes. */
function fixture(orientation?: Orientation) {
	const fixtureSplit = twoRegions(orientation);
	splitsWritten.push(fixtureSplit.split);
	return fixtureSplit;
}

describe("updateActiveHitAreas", () => {
	describe("the delta", () => {
		test("is the pointer's x travel as a percentage of splitSize", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 120 }),
					pointerDownAtPoint: { x: 100, y: 0 },
				}),
			).toEqual({ layout: { a: 60, b: 40 }, cursorFlags: 0 });
		});

		test("is the pointer's y travel in a vertical Split", () => {
			const { split, hitArea } = fixture("vertical");

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 500, clientY: 80 }),
					pointerDownAtPoint: { x: 0, y: 100 },
				}),
			).toEqual({ layout: { a: 40, b: 60 }, cursorFlags: 0 });
		});

		test("is +100 without a pointer-down point, taking the layout to its limit", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 0 }),
				}),
			).toEqual({ layout: { a: 90, b: 10 }, cursorFlags: 0 });
		});

		test("is -100 without a pointer-down point when the pointer is off the start", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: -1 }),
				}),
			).toEqual({ layout: { a: 10, b: 90 }, cursorFlags: 0 });
		});

		test("follows clientY without a pointer-down point in a vertical Split", () => {
			const { split, hitArea } = fixture("vertical");

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 50, clientY: -1 }),
				}),
			).toEqual({ layout: { a: 10, b: 90 }, cursorFlags: 0 });
		});

		test("flips sign for a right-to-left Split, whose layout grows inline-start", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(true),
					event: move({ clientX: 120 }),
					pointerDownAtPoint: { x: 100, y: 0 },
				}),
			).toEqual({ layout: { a: 40, b: 60 }, cursorFlags: 0 });
		});
	});

	describe("a layout the delta cannot change", () => {
		test("is not written, and flags the horizontal max past the limit", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 120 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					layout: { a: 90, b: 10 },
				}),
			).toEqual({
				layout: undefined,
				cursorFlags: CURSOR_FLAG_HORIZONTAL_MAX,
			});
		});

		test("flags the horizontal min for a negative delta", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 80 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					layout: { a: 10, b: 90 },
				}).cursorFlags,
			).toBe(CURSOR_FLAG_HORIZONTAL_MIN);
		});

		test("flags the vertical min and max in a vertical Split", () => {
			const { split, hitArea } = fixture("vertical");
			const at = (clientY: number, layout: Layout) =>
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientY }),
					pointerDownAtPoint: { x: 0, y: 100 },
					layout,
				}).cursorFlags;

			expect(at(80, { a: 10, b: 90 })).toBe(CURSOR_FLAG_VERTICAL_MIN);
			expect(at(120, { a: 90, b: 10 })).toBe(CURSOR_FLAG_VERTICAL_MAX);
		});

		test("flags the physical direction in a right-to-left Split", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(true),
					event: move({ clientX: 120 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					layout: { a: 10, b: 90 },
				}).cursorFlags,
			).toBe(CURSOR_FLAG_HORIZONTAL_MAX);
		});

		test("flags nothing when the pointer has not moved from where it went down", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 100 }),
					pointerDownAtPoint: { x: 100, y: 0 },
				}),
			).toEqual({ layout: undefined, cursorFlags: 0 });
		});

		test("flags nothing for a Split with disableCursor", () => {
			const { split, hitArea } = fixture();
			split.mutableState.disableCursor = true;

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 120 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					layout: { a: 90, b: 10 },
				}).cursorFlags,
			).toBe(0);
		});
	});

	describe("an axis the pointer did not move along", () => {
		test("keeps the previous flags for that axis only", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 120, movementX: 0, movementY: 0 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					layout: { a: 90, b: 10 },
					prevCursorFlags:
						CURSOR_FLAG_HORIZONTAL_MIN | CURSOR_FLAG_VERTICAL_MAX,
				}).cursorFlags,
			).toBe(CURSOR_FLAG_HORIZONTAL_MIN | CURSOR_FLAG_VERTICAL_MAX);
		});

		test("takes the new flags on an axis that moved and keeps the other's", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 120, movementX: 1, movementY: 0 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					layout: { a: 90, b: 10 },
					prevCursorFlags:
						CURSOR_FLAG_HORIZONTAL_MIN | CURSOR_FLAG_VERTICAL_MAX,
				}).cursorFlags,
			).toBe(CURSOR_FLAG_HORIZONTAL_MAX | CURSOR_FLAG_VERTICAL_MAX);
		});

		test("drops the previous flags of an axis that moved", () => {
			const { split, hitArea } = fixture();

			expect(
				drag({
					split,
					hitArea: hitArea(),
					event: move({ clientX: 120, movementX: 1, movementY: 1 }),
					pointerDownAtPoint: { x: 100, y: 0 },
					prevCursorFlags:
						CURSOR_FLAG_HORIZONTAL_MIN | CURSOR_FLAG_VERTICAL_MAX,
				}).cursorFlags,
			).toBe(0);
		});
	});

	test("skips a hit area whose Split has no initial layout", () => {
		const { split, hitArea } = fixture();
		updateActiveHitAreas({
			document,
			event: move({ clientX: 120 }),
			hitAreas: [hitArea()],
			initialLayoutMap: new Map(),
			mountedSplits: mounted(split, { a: 90, b: 10 }),
			pointerDownAtPoint: { x: 100, y: 0 },
			prevCursorFlags: 0,
		});

		expect(getMountedSplitState(split.id)).toBeUndefined();
		expect(getInteractionState().cursorFlags).toBe(0);
	});

	test("skips a hit area whose Split is not mounted", () => {
		const { split, hitArea } = fixture();
		updateActiveHitAreas({
			document,
			event: move({ clientX: 120 }),
			hitAreas: [hitArea()],
			initialLayoutMap: new Map([[split, { a: 90, b: 10 }]]),
			mountedSplits: new Map(),
			pointerDownAtPoint: { x: 100, y: 0 },
			prevCursorFlags: 0,
		});

		expect(getMountedSplitState(split.id)).toBeUndefined();
		expect(getInteractionState().cursorFlags).toBe(0);
	});
});
