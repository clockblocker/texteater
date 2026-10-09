import type { RegisteredHandle } from "../../components/handle/types";
import type { RegisteredRegion } from "../../components/region/types";
import { sortByElementOffset } from "../../components/split/sortByElementOffset";
import type {
	Orientation,
	RegisteredSplit,
} from "../../components/split/types";
import { assert } from "../../utils/assert";
import { isHTMLElement } from "../../utils/isHTMLElement";
import { findClosestRect } from "../utils/findClosestRect";
import { isCoarsePointer } from "../utils/isCoarsePointer";
import { calculateAvailableSplitSize } from "./calculateAvailableSplitSize";
import { isRightToLeft } from "./isRightToLeft";

type RegionsTuple = [region: RegisteredRegion, region: RegisteredRegion];

export type HitArea = {
	split: RegisteredSplit;
	splitSize: number;
	regions: RegionsTuple;
	rect: DOMRect;
	handle?: RegisteredHandle | undefined;
	/**
	 * The Split runs horizontally under `dir="rtl"`: its regions run right to
	 * left, so a pointer moving right moves toward inline-start.
	 */
	rightToLeft: boolean;
};

/** Which Regions, counted in Split order, are enabled. */
type EnabledRegions = {
	readonly count: number;
	readonly first: number;
	readonly last: number;
};

/** What the walk along a Split's children has seen since the last Region. */
type Walk = {
	regionIndex: number;
	/** An aria-disabled Handle sits between the previous Region and the next. */
	disabledHandle: boolean;
	hasInterleavedStaticContent: boolean;
	prevRegion: RegisteredRegion | undefined;
	pendingHandles: RegisteredHandle[];
};

/**
 * Determines hit regions for a Split; a hit region is either:
 * - 1: An explicit Handle element
 * - 2: The edge of a Region element that has another Region beside it
 *
 * This method determines bounding rects of all regions for the particular split.
 */
export function calculateHitAreas(split: RegisteredSplit) {
	const { element: splitElement, orientation } = split;
	const rightToLeft =
		orientation === "horizontal" && isRightToLeft(splitElement);
	const sortedChildElements = sortedChildrenOf(split, rightToLeft);
	const enabled = enabledRegionsOf(sortedChildElements);
	const hitAreas: HitArea[] = [];

	// If all (or all but one) of the Regions are disabled, there can be no resize interactions.
	if (enabled.count <= 1) {
		return hitAreas;
	}

	const walk: Walk = {
		regionIndex: -1,
		disabledHandle: false,
		hasInterleavedStaticContent: false,
		prevRegion: undefined,
		pendingHandles: [],
	};
	for (const childElement of sortedChildElements) {
		if (childElement.hasAttribute("data-split-region")) {
			walk.regionIndex++;
			visitRegion({
				split,
				rightToLeft,
				enabled,
				walk,
				childElement,
				hitAreas,
			});
		} else if (childElement.hasAttribute("data-split-handle")) {
			visitHandle(split, walk, childElement);
		} else {
			walk.hasInterleavedStaticContent = true;
		}
	}

	return hitAreas;
}

/** The Split's child elements, sorted by offset before traversing. */
function sortedChildrenOf(
	{ element: splitElement, orientation }: RegisteredSplit,
	rightToLeft: boolean,
): HTMLElement[] {
	return sortByElementOffset(
		orientation,
		Array.from(splitElement.children)
			.filter(isHTMLElement)
			.map((element) => ({ element: element as HTMLElement })),
		rightToLeft,
	).map(({ element }) => element);
}

function enabledRegionsOf(sortedChildElements: HTMLElement[]): EnabledRegions {
	let count = 0;
	let first = -1;
	let last = -1;
	let currentRegionIndex = -1;

	for (const childElement of sortedChildElements) {
		if (!childElement.hasAttribute("data-split-region")) {
			continue;
		}
		currentRegionIndex++;

		if (!childElement.hasAttribute("data-disabled")) {
			count++;

			if (first === -1) {
				first = currentRegionIndex;
			}

			last = currentRegionIndex;
		}
	}

	return { count, first, last };
}

/**
 * A Region: the hit areas between it and the previous Region, then a fresh
 * walk from it.
 */
function visitRegion({
	split,
	rightToLeft,
	enabled,
	walk,
	childElement,
	hitAreas,
}: {
	split: RegisteredSplit;
	rightToLeft: boolean;
	enabled: EnabledRegions;
	walk: Walk;
	childElement: HTMLElement;
	hitAreas: HitArea[];
}) {
	const regionData = split.regions.find(
		(current) => current.element === childElement,
	);
	if (!regionData) {
		return;
	}

	const { prevRegion } = walk;
	if (prevRegion) {
		const prevRect = prevRegion.element.getBoundingClientRect();
		const rect = childElement.getBoundingClientRect();
		// A disabled Handle locks the pair: none of its areas are live.
		const skip =
			walk.disabledHandle ||
			walk.regionIndex <= enabled.first ||
			walk.regionIndex > enabled.last;

		for (const rectOrHandle of watchedBetween(
			split,
			rightToLeft,
			walk,
			prevRect,
			rect,
		)) {
			const hitRect = hitTargetRect(split, rectOrHandle);

			if (!skip) {
				hitAreas.push({
					split,
					splitSize: calculateAvailableSplitSize({
						split,
					}),
					regions: [prevRegion, regionData],
					rightToLeft,
					handle: "width" in rectOrHandle ? undefined : rectOrHandle,
					rect: hitRect,
				});
			}
		}
	}

	walk.disabledHandle = false;
	walk.hasInterleavedStaticContent = false;
	walk.prevRegion = regionData;
	walk.pendingHandles = [];
}

function visitHandle(
	split: RegisteredSplit,
	walk: Walk,
	childElement: HTMLElement,
) {
	if (childElement.ariaDisabled !== null) {
		walk.disabledHandle = true;
	}

	const handleData = split.handles.find(
		(current) => current.element === childElement,
	);
	if (handleData) {
		// Handles will be included implicitly in the area between the previous and next region
		// It's important to track them though, to handle the scenario of non-interactive split content
		walk.pendingHandles.push(handleData);
	} else {
		walk.prevRegion = undefined;
		walk.pendingHandles = [];
		walk.disabledHandle = false;
	}
}

/**
 * What to watch between two Regions. If an explicit Handle has been
 * rendered, always watch it; otherwise watch the entire space between the
 * regions. The one caveat is when there are non-interactive element(s)
 * between regions, in which case we may need to watch individual region
 * edges.
 */
function watchedBetween(
	{ orientation }: RegisteredSplit,
	rightToLeft: boolean,
	{ hasInterleavedStaticContent, pendingHandles }: Walk,
	prevRect: DOMRect,
	rect: DOMRect,
): (DOMRect | RegisteredHandle)[] {
	if (!hasInterleavedStaticContent) {
		return pendingHandles.length
			? pendingHandles
			: [gapRect(orientation, rightToLeft, prevRect, rect)];
	}

	// The previous region's inline-end edge and this region's inline-start edge
	const firstRegionEdgeRect = inlineEndEdge(
		orientation,
		rightToLeft,
		prevRect,
	);
	const secondRegionEdgeRect = inlineStartEdge(
		orientation,
		rightToLeft,
		rect,
	);

	switch (pendingHandles.length) {
		case 0: {
			return [firstRegionEdgeRect, secondRegionEdgeRect];
		}
		case 1: {
			const handle = pendingHandles[0];
			assert(handle, "Pending handle not found");
			const closestRect = findClosestRect({
				orientation,
				rects: [prevRect, rect],
				targetRect: handle.element.getBoundingClientRect(),
			});

			return [
				handle,
				closestRect === prevRect
					? secondRegionEdgeRect
					: firstRegionEdgeRect,
			];
		}
		default: {
			return pendingHandles;
		}
	}
}

/** The whole space between two adjacent Regions. */
function gapRect(
	orientation: Orientation,
	rightToLeft: boolean,
	prevRect: DOMRect,
	rect: DOMRect,
): DOMRect {
	if (orientation !== "horizontal") {
		return new DOMRect(
			rect.left,
			prevRect.bottom,
			rect.width,
			rect.top - prevRect.bottom,
		);
	}
	return rightToLeft
		? new DOMRect(
				rect.right,
				rect.top,
				prevRect.left - rect.right,
				rect.height,
			)
		: new DOMRect(
				prevRect.right,
				rect.top,
				rect.left - prevRect.right,
				rect.height,
			);
}

/** A Region's zero-width inline-end (or bottom) edge. */
function inlineEndEdge(
	orientation: Orientation,
	rightToLeft: boolean,
	rect: DOMRect,
): DOMRect {
	return orientation === "horizontal"
		? new DOMRect(
				rightToLeft ? rect.left : rect.right,
				rect.top,
				0,
				rect.height,
			)
		: new DOMRect(rect.left, rect.bottom, rect.width, 0);
}

/** A Region's zero-width inline-start (or top) edge. */
function inlineStartEdge(
	orientation: Orientation,
	rightToLeft: boolean,
	rect: DOMRect,
): DOMRect {
	return orientation === "horizontal"
		? new DOMRect(
				rightToLeft ? rect.right : rect.left,
				rect.top,
				0,
				rect.height,
			)
		: new DOMRect(rect.left, rect.top, rect.width, 0);
}

/** A watched rect or Handle's rect, grown to the Split's minimum hit target size. */
function hitTargetRect(
	split: RegisteredSplit,
	rectOrHandle: DOMRect | RegisteredHandle,
): DOMRect {
	let rect =
		"width" in rectOrHandle
			? rectOrHandle
			: rectOrHandle.element.getBoundingClientRect();

	const minHitTargetSize = isCoarsePointer()
		? split.resizeTargetMinimumSize.coarse
		: split.resizeTargetMinimumSize.fine;
	if (rect.width < minHitTargetSize) {
		const delta = minHitTargetSize - rect.width;
		rect = new DOMRect(
			rect.x - delta / 2,
			rect.y,
			rect.width + delta,
			rect.height,
		);
	}
	if (rect.height < minHitTargetSize) {
		const delta = minHitTargetSize - rect.height;
		rect = new DOMRect(
			rect.x,
			rect.y - delta / 2,
			rect.width,
			rect.height + delta,
		);
	}
	return rect;
}
