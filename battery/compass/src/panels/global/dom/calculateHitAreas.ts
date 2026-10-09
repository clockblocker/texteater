import type { RegisteredHandle } from "../../components/handle/types";
import type { RegisteredRegion } from "../../components/region/types";
import { sortByElementOffset } from "../../components/split/sortByElementOffset";
import type { RegisteredSplit } from "../../components/split/types";
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

/**
 * Determines hit regions for a Split; a hit region is either:
 * - 1: An explicit Handle element
 * - 2: The edge of a Region element that has another Region beside it
 *
 * This method determines bounding rects of all regions for the particular split.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function calculateHitAreas(split: RegisteredSplit) {
	const { element: splitElement, orientation, regions, handles } = split;
	const rightToLeft =
		orientation === "horizontal" && isRightToLeft(splitElement);

	// Sort elements by offset before traversing
	const sortedChildElements: HTMLElement[] = sortByElementOffset(
		orientation,
		Array.from(splitElement.children)
			.filter(isHTMLElement)
			.map((element) => ({ element: element as HTMLElement })),
		rightToLeft,
	).map(({ element }) => element);

	const hitAreas: HitArea[] = [];

	let disabledHandle = false;
	let hasInterleavedStaticContent = false;
	let firstEnabledRegionIndex = -1;
	let lastEnabledRegionIndex = -1;
	let numEnabledRegions = 0;
	let prevRegion: RegisteredRegion | undefined;
	let pendingHandles: RegisteredHandle[] = [];

	{
		let currentRegionIndex = -1;

		for (const childElement of sortedChildElements) {
			if (childElement.hasAttribute("data-split-region")) {
				currentRegionIndex++;

				if (!childElement.hasAttribute("data-disabled")) {
					numEnabledRegions++;

					if (firstEnabledRegionIndex === -1) {
						firstEnabledRegionIndex = currentRegionIndex;
					}

					lastEnabledRegionIndex = currentRegionIndex;
				}
			}
		}
	}

	// If all (or all but one) of the Regions are disabled, there can be no resize interactions.
	if (numEnabledRegions > 1) {
		let currentRegionIndex = -1;

		for (const childElement of sortedChildElements) {
			if (childElement.hasAttribute("data-split-region")) {
				currentRegionIndex++;

				const regionData = regions.find(
					(current) => current.element === childElement,
				);
				if (regionData) {
					if (prevRegion) {
						const prevRect =
							prevRegion.element.getBoundingClientRect();
						const rect = childElement.getBoundingClientRect();

						let pendingRectsOrHandles: (
							| DOMRect
							| RegisteredHandle
						)[];

						// If an explicit Handle has been rendered, always watch it
						// Otherwise watch the entire space between the regions
						// The one caveat is when there are non-interactive element(s) between regions,
						// in which case we may need to watch individual region edges
						if (hasInterleavedStaticContent) {
							// The previous region's inline-end edge and this region's
							// inline-start edge
							const firstRegionEdgeRect =
								orientation === "horizontal"
									? new DOMRect(
											rightToLeft
												? prevRect.left
												: prevRect.right,
											prevRect.top,
											0,
											prevRect.height,
										)
									: new DOMRect(
											prevRect.left,
											prevRect.bottom,
											prevRect.width,
											0,
										);
							const secondRegionEdgeRect =
								orientation === "horizontal"
									? new DOMRect(
											rightToLeft
												? rect.right
												: rect.left,
											rect.top,
											0,
											rect.height,
										)
									: new DOMRect(
											rect.left,
											rect.top,
											rect.width,
											0,
										);

							switch (pendingHandles.length) {
								case 0: {
									pendingRectsOrHandles = [
										firstRegionEdgeRect,
										secondRegionEdgeRect,
									];
									break;
								}
								case 1: {
									const handle = pendingHandles[0];
									assert(handle, "Pending handle not found");
									const closestRect = findClosestRect({
										orientation,
										rects: [prevRect, rect],
										targetRect:
											handle.element.getBoundingClientRect(),
									});

									pendingRectsOrHandles = [
										handle,
										closestRect === prevRect
											? secondRegionEdgeRect
											: firstRegionEdgeRect,
									];
									break;
								}
								default: {
									pendingRectsOrHandles = pendingHandles;
									break;
								}
							}
						} else {
							if (pendingHandles.length) {
								pendingRectsOrHandles = pendingHandles;
							} else {
								pendingRectsOrHandles = [
									orientation === "horizontal"
										? rightToLeft
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
												)
										: new DOMRect(
												rect.left,
												prevRect.bottom,
												rect.width,
												rect.top - prevRect.bottom,
											),
								];
							}
						}

						for (const rectOrHandle of pendingRectsOrHandles) {
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

							const skip =
								currentRegionIndex <= firstEnabledRegionIndex ||
								currentRegionIndex > lastEnabledRegionIndex;

							if (!disabledHandle && !skip) {
								hitAreas.push({
									split,
									splitSize: calculateAvailableSplitSize({
										split,
									}),
									regions: [prevRegion, regionData],
									rightToLeft,
									handle:
										"width" in rectOrHandle
											? undefined
											: rectOrHandle,
									rect,
								});
							}

							disabledHandle = false;
						}
					}

					hasInterleavedStaticContent = false;
					prevRegion = regionData;
					pendingHandles = [];
				}
			} else if (childElement.hasAttribute("data-split-handle")) {
				if (childElement.ariaDisabled !== null) {
					disabledHandle = true;
				}

				const handleData = handles.find(
					(current) => current.element === childElement,
				);
				if (handleData) {
					// Handles will be included implicitly in the area between the previous and next region
					// It's important to track them though, to handle the scenario of non-interactive split content
					pendingHandles.push(handleData);
				} else {
					prevRegion = undefined;
					pendingHandles = [];
				}
			} else {
				hasInterleavedStaticContent = true;
			}
		}
	}

	return hitAreas;
}
