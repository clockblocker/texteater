import type { RegionConstraints } from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { assert } from "../../utils/assert";
import { isArrayEqual } from "../../utils/isArrayEqual";
import { compareLayoutNumbers } from "../utils/compareLayoutNumbers";
import { layoutNumbersEqual } from "../utils/layoutNumbersEqual";
import { validateRegionSize } from "../utils/validateRegionSize";

// All units must be in percentages; pixel values should be pre-converted
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function adjustLayoutByDelta({
	delta,
	initialLayout: initialLayoutProp,
	regionConstraints: regionConstraintsArray,
	pivotIndices,
	prevLayout: prevLayoutProp,
	trigger,
}: {
	delta: number;
	initialLayout: Layout;
	regionConstraints: RegionConstraints[];
	pivotIndices: number[];
	prevLayout: Layout;
	trigger?: "imperative-api" | "keyboard" | "mouse-or-touch";
}): Layout {
	if (layoutNumbersEqual(delta, 0)) {
		return initialLayoutProp;
	}

	const overrideDisabledRegions = trigger === "imperative-api";

	const initialLayout = Object.values(initialLayoutProp);
	const prevLayout = Object.values(prevLayoutProp);
	const nextLayout = [...initialLayout];

	const [firstPivotIndex, secondPivotIndex] = pivotIndices;
	assert(firstPivotIndex != null, "Invalid first pivot index");
	assert(secondPivotIndex != null, "Invalid second pivot index");

	let deltaApplied = 0;
	switch (trigger) {
		case "keyboard": {
			// If this is a resize triggered by a keyboard event, our logic for expanding/collapsing is different.
			// We no longer check the halfway threshold because this may prevent the region from expanding at all.
			{
				// Check if we should expand a collapsed region
				const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
				const regionConstraints = regionConstraintsArray[index];
				assert(
					regionConstraints,
					`Region constraints not found for index ${index}`,
				);

				const {
					collapsedSize = 0,
					collapsible,
					minSize = 0,
				} = regionConstraints;

				// DEBUG.push(`edge case check 1: ${index}`);
				// DEBUG.push(`  -> collapsible? ${collapsible}`);
				if (collapsible) {
					const prevSize = initialLayout[index];
					assert(
						prevSize != null,
						`Previous layout not found for region index ${index}`,
					);

					if (layoutNumbersEqual(prevSize, collapsedSize)) {
						const localDelta = minSize - prevSize;
						// DEBUG.push(`  -> expand delta: ${localDelta}`);

						if (
							compareLayoutNumbers(localDelta, Math.abs(delta)) >
							0
						) {
							delta = delta < 0 ? 0 - localDelta : localDelta;
							// DEBUG.push(`  -> delta: ${delta}`);
						}
					}
				}
			}

			{
				// Check if we should collapse a region at its minimum size
				const index = delta < 0 ? firstPivotIndex : secondPivotIndex;
				const regionConstraints = regionConstraintsArray[index];
				assert(
					regionConstraints,
					`No region constraints found for index ${index}`,
				);

				const {
					collapsedSize = 0,
					collapsible,
					minSize = 0,
				} = regionConstraints;

				// DEBUG.push(`edge case check 2: ${index}`);
				// DEBUG.push(`  -> collapsible? ${collapsible}`);
				if (collapsible) {
					const prevSize = initialLayout[index];
					assert(
						prevSize != null,
						`Previous layout not found for region index ${index}`,
					);

					if (layoutNumbersEqual(prevSize, minSize)) {
						const localDelta = prevSize - collapsedSize;
						// DEBUG.push(`  -> expand delta: ${localDelta}`);

						if (
							compareLayoutNumbers(localDelta, Math.abs(delta)) >
							0
						) {
							delta = delta < 0 ? 0 - localDelta : localDelta;
							// DEBUG.push(`  -> delta: ${delta}`);
						}
					}
				}
			}
			break;
		}
		default: {
			// If we're starting from a collapsed state, dragging past the halfway point should cause the region to expand
			// This can happen for positive or negative drags, and regions on either side of the handle can be collapsible
			// The easiest way to support this is to detect this scenario and pre-adjust the delta before applying the rest of the layout algorithm
			// DEBUG.push(`edge case check 3: collapsible regions`);

			const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
			const regionConstraints = regionConstraintsArray[index];
			assert(
				regionConstraints,
				`Region constraints not found for index ${index}`,
			);

			const prevSize = initialLayout[index];
			assert(
				prevSize != null,
				`Previous layout not found for region index ${index}`,
			);

			const { collapsible, collapsedSize, minSize } = regionConstraints;
			if (collapsible && compareLayoutNumbers(prevSize, minSize) < 0) {
				// DEBUG.push(`  -> collapsible ${delta < 0 ? "2nd" : "1st"} region`);
				if (delta > 0) {
					const gapSize = minSize - collapsedSize;
					const halfwayDelta = gapSize / 2;
					// DEBUG.push(`  -> halfway delta: ${halfwayDelta}`);
					// DEBUG.push(`       collapsed: ${collapsedSize}`);
					// DEBUG.push(`       min: ${minSize}`);

					const nextSize = prevSize + delta;
					if (compareLayoutNumbers(nextSize, minSize) < 0) {
						// DEBUG.push("  -> adjusting delta");
						// DEBUG.push(`       from: ${delta}`);
						delta =
							compareLayoutNumbers(delta, halfwayDelta) <= 0
								? 0
								: gapSize;
						// DEBUG.push(`       to: ${delta}`);
					}
				} else {
					const gapSize = minSize - collapsedSize;
					const halfwayDelta = 100 - gapSize / 2;
					// DEBUG.push(`  -> halfway delta: ${halfwayDelta}`);
					// DEBUG.push(`       collapsed: ${100 - collapsedSize}`);
					// DEBUG.push(`       min: ${100 - minSize}`);

					const nextSize = prevSize - delta;
					if (compareLayoutNumbers(nextSize, minSize) < 0) {
						// DEBUG.push("  -> adjusting delta");
						// DEBUG.push(`       from: ${delta}`);
						delta =
							compareLayoutNumbers(100 + delta, halfwayDelta) > 0
								? 0
								: -gapSize;
						// DEBUG.push(`       to: ${delta}`);
					}
				}
			}
			break;
		}
	}

	{
		// Pre-calculate max available delta in the opposite direction of our pivot.
		// This will be the maximum amount we're allowed to expand/contract the regions in the primary direction.
		// If this amount is less than the requested delta, adjust the requested delta.
		// If this amount is greater than the requested delta, that's useful information too–
		// as an expanding region might change from collapsed to min size.

		const increment = delta < 0 ? 1 : -1;

		let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
		let maxAvailableDelta = 0;

		// DEBUG.push("pre calc...");
		while (true) {
			const prevSize = initialLayout[index];
			assert(
				prevSize != null,
				`Previous layout not found for region index ${index}`,
			);

			const regionConstraints = regionConstraintsArray[index];
			assert(
				regionConstraints,
				`Region constraints not found for index ${index}`,
			);

			const maxSafeSize = validateRegionSize({
				overrideDisabledRegions,
				regionConstraints,
				prevSize,
				size: 100,
			});
			const delta = maxSafeSize - prevSize;
			// DEBUG.push(`  ${index}: ${prevSize} -> ${maxSafeSize}`);

			maxAvailableDelta += delta;
			index += increment;

			if (index < 0 || index >= regionConstraintsArray.length) {
				break;
			}
		}

		// DEBUG.push(`  -> max available delta: ${maxAvailableDelta}`);
		const minAbsDelta = Math.min(
			Math.abs(delta),
			Math.abs(maxAvailableDelta),
		);
		delta = delta < 0 ? 0 - minAbsDelta : minAbsDelta;
		// DEBUG.push(`  -> adjusted delta: ${delta}`);
		// DEBUG.push("");
	}

	{
		// Delta added to a region needs to be subtracted from other regions (within the constraints that those regions allow).

		const pivotIndex = delta < 0 ? firstPivotIndex : secondPivotIndex;
		let index = pivotIndex;
		while (index >= 0 && index < regionConstraintsArray.length) {
			const deltaRemaining = Math.abs(delta) - Math.abs(deltaApplied);

			const prevSize = initialLayout[index];
			assert(
				prevSize != null,
				`Previous layout not found for region index ${index}`,
			);

			const regionConstraints = regionConstraintsArray[index];
			assert(
				regionConstraints,
				`Region constraints not found for index ${index}`,
			);

			const unsafeSize = prevSize - deltaRemaining;
			const safeSize = validateRegionSize({
				overrideDisabledRegions,
				regionConstraints,
				prevSize,
				size: unsafeSize,
			});

			if (!layoutNumbersEqual(prevSize, safeSize)) {
				deltaApplied += prevSize - safeSize;

				nextLayout[index] = safeSize;

				if (
					deltaApplied
						.toFixed(3)
						.localeCompare(Math.abs(delta).toFixed(3), undefined, {
							numeric: true,
						}) >= 0
				) {
					break;
				}
			}

			if (delta < 0) {
				index--;
			} else {
				index++;
			}
		}
	}
	// DEBUG.push(`after 1: ${nextLayout.join(", ")}`);
	// DEBUG.push(`  deltaApplied: ${deltaApplied}`);
	// DEBUG.push("");

	// If we were unable to resize any of the regions regions, return the previous state.
	// This will essentially bailout and ignore e.g. drags past a region's boundaries
	if (isArrayEqual(prevLayout, nextLayout)) {
		// DEBUG.push(`bailout to previous layout: ${prevLayout.join(", ")}`);
		// console.log(DEBUG.join("\n"));

		return prevLayoutProp;
	}

	{
		// Now distribute the applied delta to the regions in the other direction
		const pivotIndex = delta < 0 ? secondPivotIndex : firstPivotIndex;

		const prevSize = initialLayout[pivotIndex];
		assert(
			prevSize != null,
			`Previous layout not found for region index ${pivotIndex}`,
		);

		const regionConstraints = regionConstraintsArray[pivotIndex];
		assert(
			regionConstraints,
			`Region constraints not found for index ${pivotIndex}`,
		);

		const unsafeSize = prevSize + deltaApplied;
		const safeSize = validateRegionSize({
			overrideDisabledRegions,
			regionConstraints,
			prevSize,
			size: unsafeSize,
		});

		// Adjust the pivot region before, but only by the amount that surrounding regions were able to shrink/contract.
		nextLayout[pivotIndex] = safeSize;

		// Edge case where expanding or contracting one region caused another one to change collapsed state
		if (!layoutNumbersEqual(safeSize, unsafeSize)) {
			let deltaRemaining = unsafeSize - safeSize;

			const pivotIndex = delta < 0 ? secondPivotIndex : firstPivotIndex;
			let index = pivotIndex;
			while (index >= 0 && index < regionConstraintsArray.length) {
				const prevSize = nextLayout[index];
				assert(
					prevSize != null,
					`Previous layout not found for region index ${index}`,
				);

				const regionConstraints = regionConstraintsArray[index];
				assert(
					regionConstraints,
					`Region constraints not found for index ${index}`,
				);

				const unsafeSize = prevSize + deltaRemaining;
				const safeSize = validateRegionSize({
					overrideDisabledRegions,
					regionConstraints,
					prevSize,
					size: unsafeSize,
				});

				if (!layoutNumbersEqual(prevSize, safeSize)) {
					deltaRemaining -= safeSize - prevSize;

					nextLayout[index] = safeSize;
				}

				if (layoutNumbersEqual(deltaRemaining, 0)) {
					break;
				}

				if (delta > 0) {
					index--;
				} else {
					index++;
				}
			}
		}
	}
	// DEBUG.push(`after 2: ${nextLayout.join(", ")}`);
	// DEBUG.push(`  deltaApplied: ${deltaApplied}`);
	// DEBUG.push("");

	const totalSize = Object.values(nextLayout).reduce(
		(total, size) => size + total,
		0,
	);
	// DEBUG.push(`total size: ${totalSize}`);

	// If our new layout doesn't add up to 100%, that means the requested delta can't be applied
	// In that case, fall back to our most recent valid layout
	// Allow for a small rounding difference, else e.g. 3 region layouts may never be considered valid
	if (!layoutNumbersEqual(totalSize, 100, 0.1)) {
		// DEBUG.push(`bailout to previous layout: ${prevLayout.join(", ")}`);
		// console.log(DEBUG.join("\n"));

		return prevLayoutProp;
	}

	const prevLayoutKeys = Object.keys(prevLayoutProp);

	// console.log(DEBUG.join("\n"));
	return nextLayout.reduce<Layout>((accumulated, current, index) => {
		const key = prevLayoutKeys[index];
		assert(key != null, `Previous layout key not found for index ${index}`);
		accumulated[key] = current;
		return accumulated;
	}, {});
}
