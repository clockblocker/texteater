import type { RegionConstraints } from "../../components/region/types";
import type { Layout } from "../../components/split/types";
import { assert } from "../../utils/assert";
import { layoutNumbersEqual } from "./layoutNumbersEqual";
import { validateRegionSize } from "./validateRegionSize";

// All units must be in percentages; pixel values should be pre-converted
export function validateSplitLayout({
	layout,
	regionConstraints,
}: {
	layout: Layout;
	regionConstraints: RegionConstraints[];
}): Layout {
	const prevLayout = Object.values(layout);
	const nextLayout = [...prevLayout];

	const nextLayoutTotalSize = nextLayout.reduce(
		(accumulated, current) => accumulated + current,
		0,
	);

	// Validate layout expectations
	if (nextLayout.length !== regionConstraints.length) {
		throw Error(
			`Invalid ${regionConstraints.length} region layout: ${nextLayout
				.map((size) => `${size}%`)
				.join(", ")}`,
		);
	} else if (
		!layoutNumbersEqual(nextLayoutTotalSize, 100) &&
		nextLayout.length > 0
	) {
		for (let index = 0; index < regionConstraints.length; index++) {
			const unsafeSize = nextLayout[index];
			assert(
				unsafeSize != null,
				`No layout data found for index ${index}`,
			);
			const safeSize = (100 / nextLayoutTotalSize) * unsafeSize;
			nextLayout[index] = safeSize;
		}
	}

	let remainingSize = 0;

	// First pass: Validate the proposed layout given each region's constraints
	for (let index = 0; index < regionConstraints.length; index++) {
		const prevSize = prevLayout[index];
		assert(prevSize != null, `No layout data found for index ${index}`);

		const unsafeSize = nextLayout[index];
		assert(unsafeSize != null, `No layout data found for index ${index}`);

		const constraints = regionConstraints[index];
		assert(constraints, `No region constraints found for index ${index}`);

		const safeSize = validateRegionSize({
			overrideDisabledRegions: true,
			regionConstraints: constraints,
			prevSize,
			size: unsafeSize,
		});

		if (unsafeSize !== safeSize) {
			remainingSize += unsafeSize - safeSize;

			nextLayout[index] = safeSize;
		}
	}

	// If there is additional, left over space, assign it to any region(s) that permits it
	// (It's not worth taking multiple additional passes to evenly distribute)
	if (!layoutNumbersEqual(remainingSize, 0)) {
		for (let index = 0; index < regionConstraints.length; index++) {
			const prevSize = nextLayout[index];
			assert(prevSize != null, `No layout data found for index ${index}`);
			const constraints = regionConstraints[index];
			assert(
				constraints,
				`No region constraints found for index ${index}`,
			);
			const unsafeSize = prevSize + remainingSize;
			const safeSize = validateRegionSize({
				overrideDisabledRegions: true,
				regionConstraints: constraints,
				prevSize,
				size: unsafeSize,
			});

			if (prevSize !== safeSize) {
				remainingSize -= safeSize - prevSize;
				nextLayout[index] = safeSize;

				// Once we've used up the remainder, bail
				if (layoutNumbersEqual(remainingSize, 0)) {
					break;
				}
			}
		}
	}

	const prevLayoutKeys = Object.keys(layout);

	return nextLayout.reduce<Layout>((accumulated, current, index) => {
		const key = prevLayoutKeys[index];
		assert(key != null, `No layout key found for index ${index}`);
		accumulated[key] = current;
		return accumulated;
	}, {});
}
