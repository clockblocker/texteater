import type {
	RegionConstraints,
	RegionImperativeHandle,
	RegisteredRegion,
} from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { calculateAvailableSplitSize } from "../dom/calculateAvailableSplitSize";
import { getMountedSplits, updateMountedSplit } from "../mutable-state/splits";
import { sizeStyleToPixels } from "../styles/sizeStyleToPixels";
import { adjustLayoutByDelta } from "./adjustLayoutByDelta";
import { formatLayoutNumber } from "./formatLayoutNumber";
import { layoutNumbersEqual } from "./layoutNumbersEqual";
import { layoutsEqual } from "./layoutsEqual";
import { validateSplitLayout } from "./validateSplitLayout";

export function getImperativeRegionMethods({
	splitId,
	regionId,
}: {
	splitId: string;
	regionId: string;
}): RegionImperativeHandle {
	const find = () => {
		const mountedSplits = getMountedSplits();
		for (const [
			split,
			{
				defaultLayoutDeferred,
				derivedRegionConstraints,
				layout,
				splitSize,
				handleToRegions,
			},
		] of mountedSplits) {
			if (split.id === splitId) {
				return {
					defaultLayoutDeferred,
					derivedRegionConstraints,
					split,
					splitSize,
					layout,
					handleToRegions,
				};
			}
		}

		throw Error(`Split ${splitId} not found`);
	};

	const getRegionConstraints = () => {
		const match = find().derivedRegionConstraints.find(
			(current) => current.regionId === regionId,
		);
		if (match !== undefined) {
			return match;
		}

		throw Error(`Region constraints not found for Region ${regionId}`);
	};

	const getRegion = () => {
		const match = find().split.regions.find(
			(current) => current.id === regionId,
		);
		if (match !== undefined) {
			return match;
		}

		throw Error(`Layout not found for Region ${regionId}`);
	};

	const getRegionSize = () => {
		const match = find().layout[regionId];
		if (match !== undefined) {
			return match;
		}

		throw Error(`Layout not found for Region ${regionId}`);
	};

	/**
	 * Compute the next (unvalidated) layout when resizing a region imperatively.
	 *
	 * Handles two edge cases for the last region:
	 * 1. Single region in the split — no sibling exists to form valid pivot indices.
	 * 2. All preceding regions are already collapsed — the normal reversed-delta
	 *    logic would cascade the freed space to the first region. Instead the last
	 *    region keeps the remainder so it stays the largest.
	 */
	const computeLayout = ({
		nextSize,
		regions,
		prevLayout,
		derivedRegionConstraints,
	}: {
		nextSize: number;
		regions: RegisteredRegion[];
		prevLayout: Layout;
		derivedRegionConstraints: RegionConstraints[];
	}): Layout => {
		const prevSize = getRegionSize();

		const index = regions.findIndex((current) => current.id === regionId);
		const isFirstRegion = index === 0;
		const isLastRegion = index === regions.length - 1;

		const allPreviousCollapsed =
			isLastRegion &&
			nextSize < prevSize &&
			(isFirstRegion ||
				regions.slice(0, index).every((_region, regionIndex) => {
					const pc = derivedRegionConstraints[regionIndex];
					if (!pc?.collapsible) {
						return false;
					}
					const size = prevLayout[pc.regionId];
					return (
						size !== undefined &&
						layoutNumbersEqual(pc.collapsedSize, size)
					);
				}));

		if (allPreviousCollapsed) {
			const occupiedByPrevious = regions
				.slice(0, index)
				.reduce(
					(total, region) => total + (prevLayout[region.id] ?? 0),
					0,
				);
			return {
				...prevLayout,
				[regionId]: formatLayoutNumber(100 - occupiedByPrevious),
			};
		}

		return adjustLayoutByDelta({
			delta: isLastRegion ? prevSize - nextSize : nextSize - prevSize,
			initialLayout: prevLayout,
			regionConstraints: derivedRegionConstraints,
			pivotIndices: isLastRegion
				? [index - 1, index]
				: [index, index + 1],
			prevLayout,
			trigger: "imperative-api",
		});
	};

	const setRegionSize = (nextSize: number) => {
		const prevSize = getRegionSize();
		if (nextSize === prevSize) {
			return;
		}

		const {
			defaultLayoutDeferred,
			derivedRegionConstraints,
			split,
			splitSize,
			layout: prevLayout,
			handleToRegions,
		} = find();

		const unsafeLayout = computeLayout({
			nextSize,
			regions: split.regions,
			prevLayout,
			derivedRegionConstraints,
		});

		const nextLayout = validateSplitLayout({
			layout: unsafeLayout,
			regionConstraints: derivedRegionConstraints,
		});
		if (!layoutsEqual(prevLayout, nextLayout)) {
			updateMountedSplit(split, {
				defaultLayoutDeferred,
				derivedRegionConstraints,
				splitSize,
				layout: nextLayout,
				handleToRegions,
			});
		}
	};

	return {
		collapse: () => {
			const { collapsible, collapsedSize } = getRegionConstraints();
			const { mutableValues } = getRegion();
			const size = getRegionSize();

			if (collapsible && size !== collapsedSize) {
				// Store previous size in to restore if expand() is called
				mutableValues.expandToSize = size;

				setRegionSize(collapsedSize);
			}
		},
		expand: () => {
			const { collapsible, collapsedSize, minSize } =
				getRegionConstraints();
			const { mutableValues } = getRegion();
			const size = getRegionSize();

			if (collapsible && size === collapsedSize) {
				// Restore pre-collapse size, fallback to minSize
				let nextSize = mutableValues.expandToSize ?? minSize;

				// Edge case: if minSize is 0, pick something meaningful to expand the region to
				if (nextSize === 0) {
					nextSize = 1;
				}

				setRegionSize(nextSize);
			}
		},
		getSize: () => {
			const { split } = find();
			const asPercentage = getRegionSize();
			const { element } = getRegion();

			const inPixels =
				split.orientation === "horizontal"
					? element.offsetWidth
					: element.offsetHeight;

			return {
				asPercentage,
				inPixels,
			};
		},
		isCollapsed: () => {
			const { collapsible, collapsedSize } = getRegionConstraints();
			const size = getRegionSize();

			return collapsible && layoutNumbersEqual(collapsedSize, size);
		},
		resize: (size: number | string) => {
			const { split } = find();
			const { element } = getRegion();
			const splitSize = calculateAvailableSplitSize({ split });

			const asPixels = sizeStyleToPixels({
				splitSize,
				regionElement: element,
				styleProp: size,
			});

			const asPercentage = formatLayoutNumber(
				(asPixels / splitSize) * 100,
			);

			setRegionSize(asPercentage);
		},
	} satisfies RegionImperativeHandle;
}
